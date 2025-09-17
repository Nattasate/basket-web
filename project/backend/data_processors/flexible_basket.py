
"""
flexible_basket.py
A dependency-light, production-friendly basket analysis module.

Key features
- Reads CSV/Excel with unpredictable/unknown column names
- Detects likely item / order / customer / date columns heuristically
- Handles both "long" format (one row per item) and "list" format (one row per order with items separated by commas)
- Implements a pure-Python Apriori + association rule miner (no mlxtend needed)
- Returns clean pandas DataFrames for frequent itemsets and rules

Usage (CLI)
    python flexibasket_cli.py --input yourfile.csv --min_support 0.001 --sep auto

Integration (Flask)
    from flexible_basket import analyze_file
    rules_df, items_df, meta = analyze_file(uploaded_path, min_support=0.001)
    # Return JSON or CSV as needed

Author: ChatGPT (flexible for real-world messy data)
"""

from __future__ import annotations
import os
import json
import math
import itertools
import re
from typing import Dict, List, Tuple, Optional, Set, Any
from dataclasses import dataclass

import pandas as pd
import numpy as np

# -----------------------------
# Column detection heuristics
# -----------------------------

ITEM_SYNONYMS = [
    "itemdescription","item","items","product","productname","product_name","sku","description","product title",
    "ชื่อสินค้า","สินค้า","ชื่อ","รายการ","รายการสินค้า","tag","tags","label","category","categories"
]
ORDER_SYNONYMS = [
    "order_id","orderid","invoice","invoiceno","invoicenumber","receipt","billno","transaction","transaction_id",
    "basketid","basket","single_transaction","เลขที่ใบเสร็จ","เลขที่คำสั่งซื้อ","order","orderno","order no","idออเดอร์"
]
CUSTOMER_SYNONYMS = [
    "membernumber","member","customer","customerid","customer_id","userid","buyer","user","client","account",
    "เบอร์","เบอร์โทร","phone","โทรศัพท์","email","อีเมล"
]
DATE_SYNONYMS = [
    "date","datetime","timestamp","time","created_at","order_date","invoicedate","วันที่","วันเวลา"
]

LIST_FORMAT_SYNONYMS = [
    "items","order_items","รายการสินค้า","products","tags","tag","categories","category"
]

NON_ALPHA_NUM = re.compile(r"[^a-z0-9]+")

def norm(s: str) -> str:
    return NON_ALPHA_NUM.sub("", str(s).strip().lower())

def guess_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    cols = list(df.columns)
    norm_map = {col: norm(col) for col in cols}
    cand_norms = set([norm(c) for c in candidates])
    # direct exact match first
    for col in cols:
        if norm_map[col] in cand_norms:
            return col
    # partial / contains match
    for col in cols:
        n = norm_map[col]
        for c in cand_norms:
            if c and (c in n or n in c):
                return col
    return None

# ----------------------------------
# Transaction building helpers
# ----------------------------------

def ensure_string_col(df: pd.DataFrame, col: str) -> pd.Series:
    s = df[col]
    if isinstance(s, pd.DataFrame):
        s = s.iloc[:, 0]
    s = s.astype(str)
    s = s.str.strip()
    return s

def parse_date_maybe(s: pd.Series) -> pd.Series:
    try:
        d = pd.to_datetime(s, errors="coerce")
        # normalize to date only to avoid over-fragmenting baskets
        return d.dt.date.astype(str)
    except Exception:
        return s

def explode_list_column(df: pd.DataFrame, items_col: str) -> pd.DataFrame:
    # split by comma/semicolon/| and explode
    series = df[items_col]
    if isinstance(series, pd.DataFrame):
        series = series.iloc[:, 0]
    split = (
        series
        .astype(str)
        .str.split(r"[,\|;]+", expand=False)
        .apply(lambda lst: [x.strip() for x in lst if str(x).strip() != ""] if isinstance(lst, list) else [])
    )
    out = df.copy()
    out[items_col] = split
    out = out.explode(items_col).rename(columns={items_col: "__item__"})
    out = out[out["__item__"].notna() & (out["__item__"].astype(str).str.strip() != "")]
    return out

@dataclass
class DetectResult:
    item_col: Optional[str]
    order_col: Optional[str]
    customer_col: Optional[str]
    date_col: Optional[str]
    used_list_mode: bool

def detect_columns(df: pd.DataFrame) -> DetectResult:
    # Try list-format first (one row/order, items list in a single col)
    list_col = guess_column(df, LIST_FORMAT_SYNONYMS)
    item_col = guess_column(df, ITEM_SYNONYMS)
    order_col = guess_column(df, ORDER_SYNONYMS)
    cust_col  = guess_column(df, CUSTOMER_SYNONYMS)
    date_col  = guess_column(df, DATE_SYNONYMS)

    used_list_mode = False
    if list_col is not None and order_col is not None:
        used_list_mode = True
        return DetectResult(item_col="__item__", order_col=order_col, customer_col=cust_col, date_col=date_col, used_list_mode=True)

    # If not list mode, we need an item column
    if item_col is None:
        # last resort: if a column has high cardinality and stringy, assume it's item
        str_cols = [c for c in df.columns if df[c].dtype == "object"]
        if len(str_cols) > 0:
            cand = max(str_cols, key=lambda c: df[c].nunique(dropna=True))
            item_col = cand

    return DetectResult(item_col=item_col, order_col=order_col, customer_col=cust_col, date_col=date_col, used_list_mode=False)

def build_transactions(df: pd.DataFrame, dr: DetectResult) -> Tuple[pd.DataFrame, str, str]:
    """
    Returns (long_df, item_col, trans_col)
    long_df has columns [trans_col, item_col]
    """
    if dr.item_col is None:
        raise ValueError("ไม่พบคอลัมน์สินค้า (item). กรุณาตรวจสอบไฟล์หรือเพิ่มคอลัมน์สินค้าให้ตรวจจับได้")

    working = df.copy()

    # If list-format, explode first
    if dr.used_list_mode:
        working = explode_list_column(working, guess_column(df, LIST_FORMAT_SYNONYMS))
        item_col = "__item__"
    else:
        item_col = dr.item_col

    # Determine transaction id column
    trans_col = None
    if dr.order_col is not None:
        trans_col = dr.order_col
    elif dr.customer_col is not None and dr.date_col is not None:
        # combine customer + date as transaction id
        c = ensure_string_col(working, dr.customer_col)
        d = parse_date_maybe(ensure_string_col(working, dr.date_col))
        trans_col = "__customer_date__"
        working[trans_col] = (c.fillna("") + "|" + d.fillna(""))
    elif dr.customer_col is not None:
        trans_col = dr.customer_col
    elif dr.date_col is not None:
        # group by date as a last resort
        d = parse_date_maybe(ensure_string_col(working, dr.date_col))
        trans_col = "__date__"
        working[trans_col] = d
    else:
        # Fallback: create a rolling transaction id every N rows (very rough)
        trans_col = "__rowgroup__"
        working[trans_col] = (np.arange(len(working)) // 5).astype(str)

    # Clean items/trans
    working = working[[trans_col, item_col]].copy()

    # If duplicate-named columns created DataFrames on selection, reduce to first actual Series
    if isinstance(working[item_col], pd.DataFrame):
        working[item_col] = working[item_col].iloc[:, 0]
    if isinstance(working[trans_col], pd.DataFrame):
        working[trans_col] = working[trans_col].iloc[:, 0]

    working[item_col] = working[item_col].astype(str).str.strip()
    working = working[working[item_col] != ""]
    working = working.dropna(subset=[trans_col, item_col])

    # Deduplicate (same item repeated within same transaction)
    working = working.drop_duplicates(subset=[trans_col, item_col])

    return working, item_col, trans_col

# ----------------------------------
# Apriori (pure Python)
# ----------------------------------

def _generate_candidates(prev_frequents: List[frozenset], k: int) -> Set[frozenset]:
    """ Join step: generate C_k from L_{k-1} """
    cands = set()
    n = len(prev_frequents)
    for i in range(n):
        for j in range(i+1, n):
            a = prev_frequents[i]
            b = prev_frequents[j]
            union = a | b
            if len(union) == k:
                # prune: all subsets must be frequent
                all_subsets_ok = True
                for subset in itertools.combinations(union, k-1):
                    if frozenset(subset) not in prev_frequents:
                        all_subsets_ok = False
                        break
                if all_subsets_ok:
                    cands.add(union)
    return cands

def _count_support(candidates: Set[frozenset], transactions: List[Set[str]]) -> Dict[frozenset, float]:
    counts = {c: 0 for c in candidates}
    n = float(len(transactions))
    for t in transactions:
        for c in candidates:
            if c.issubset(t):
                counts[c] += 1
    # convert to support
    return {k: v/n for k, v in counts.items() if v > 0}

def apriori(transactions: List[Set[str]], min_support: float=0.001) -> Dict[int, Dict[frozenset, float]]:
    """Return dictionary k -> {itemset: support} of frequent itemsets."""
    # 1-itemsets
    item_counts = {}
    n = float(len(transactions))
    for t in transactions:
        for i in t:
            item_counts[i] = item_counts.get(i, 0) + 1
    L1 = {frozenset([i]): c/n for i, c in item_counts.items() if (c/n) >= min_support}
    frequents = {1: L1}
    k = 2
    prev = list(L1.keys())

    while prev:
        Ck = _generate_candidates(prev, k)
        Sk = _count_support(Ck, transactions)
        Lk = {s: sup for s, sup in Sk.items() if sup >= min_support}
        if not Lk:
            break
        frequents[k] = Lk
        prev = list(Lk.keys())
        k += 1

    return frequents

def generate_rules(frequents: Dict[int, Dict[frozenset, float]], min_lift: float=1.0) -> List[Dict[str, Any]]:
    """Generate association rules from frequent itemsets with standard metrics."""
    # Build a support lookup for convenience
    support_lookup = {}
    for k, level in frequents.items():
        for itemset, sup in level.items():
            support_lookup[itemset] = sup

    rules = []
    for k, level in frequents.items():
        if k < 2:
            continue
        for itemset, supp_ab in level.items():
            items = list(itemset)
            # all non-empty proper subsets
            for r in range(1, len(items)):
                for antecedent in itertools.combinations(items, r):
                    antecedent = frozenset(antecedent)
                    consequent = itemset - antecedent
                    if not consequent:
                        continue
                    supp_a = support_lookup.get(antecedent, 0.0)
                    supp_b = support_lookup.get(consequent, 0.0)
                    if supp_a == 0 or supp_b == 0:
                        continue
                    confidence = supp_ab / supp_a if supp_a > 0 else 0.0
                    lift = confidence / supp_b if supp_b > 0 else float("inf")
                    if lift < min_lift:
                        continue
                    rules.append({
                        "antecedents": tuple(sorted(list(antecedent))),
                        "consequents": tuple(sorted(list(consequent))),
                        "support": supp_ab,
                        "confidence": confidence,
                        "lift": lift,
                    })
    # Sort by lift desc then confidence desc
    rules.sort(key=lambda x: (x["lift"], x["confidence"], x["support"]), reverse=True)
    return rules

# ----------------------------------
# Public API
# ----------------------------------

def analyze_dataframe(df: pd.DataFrame,
                      min_support: float=0.001,
                      min_lift: float=1.0) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Returns (rules_df, frequent_itemsets_df, meta)
    """
    dr = detect_columns(df)
    long_df, item_col, trans_col = build_transactions(df, dr)

    # Build transactions (list of sets)
    transactions = (
        long_df.groupby(trans_col)[item_col]
        .apply(lambda s: set([str(x) for x in s.values if pd.notna(x) and str(x).strip() != ""]))
        .tolist()
    )
    # Apriori
    freqs = apriori(transactions, min_support=min_support)
    rules = generate_rules(freqs, min_lift=min_lift)

    # Convert frequents to DataFrame
    rows = []
    for k, level in freqs.items():
        for itemset, sup in level.items():
            rows.append({
                "itemset": tuple(sorted(list(itemset))),
                "length": k,
                "support": sup
            })
    fi_df = pd.DataFrame(rows)
    if not fi_df.empty:
        fi_df = fi_df.sort_values(["length","support"], ascending=[True, False]).reset_index(drop=True)
    rules_df = pd.DataFrame(rules)

    meta = {
        "detected_item_col": item_col,
        "detected_trans_col": trans_col,
        "heuristics": {
            "order_col": dr.order_col,
            "customer_col": dr.customer_col,
            "date_col": dr.date_col,
            "used_list_mode": dr.used_list_mode
        },
        "n_transactions": len(transactions),
        "n_unique_items": int(long_df[item_col].nunique())
    }
    return rules_df, fi_df, meta

def _dedupe_columns(df: pd.DataFrame) -> pd.DataFrame:
    seen = {}
    new_cols = []
    for c in df.columns:
        s = str(c)
        if s in seen:
            seen[s] += 1
            new_cols.append(f"{s}.{seen[s]}")
        else:
            seen[s] = 0
            new_cols.append(s)
    df.columns = new_cols
    return df

def read_any(path: str, sep: Optional[str]="auto", sheet: Optional[str]=None) -> pd.DataFrame:
    ext = os.path.splitext(path)[1].lower()
    if ext in [".xls", ".xlsx", ".xlsm"]:
        df = pd.read_excel(path, sheet_name=sheet)
        return _dedupe_columns(df)
    elif ext in [".csv", ".txt", ".tsv"]:
        if sep == "auto":
            # try common seps
            for s in [",","\t",";","|"]:
                try:
                    df = pd.read_csv(path, sep=s, engine="python", on_bad_lines="skip")
                    if df.shape[1] > 0:
                        return _dedupe_columns(df)
                except Exception:
                    continue
            # fallback
            df = pd.read_csv(path, engine="python", on_bad_lines="skip")
            return _dedupe_columns(df)
        else:
            df = pd.read_csv(path, sep=sep, engine="python", on_bad_lines="skip")
            return _dedupe_columns(df)
    else:
        # try csv anyway
        df = pd.read_csv(path, engine="python", on_bad_lines="skip")
        return _dedupe_columns(df)

def analyze_file(path: str,
                 min_support: float=0.001,
                 min_lift: float=1.0,
                 sep: Optional[str]="auto",
                 sheet: Optional[str]=None) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    df = read_any(path, sep=sep, sheet=sheet)
    return analyze_dataframe(df, min_support=min_support, min_lift=min_lift)
