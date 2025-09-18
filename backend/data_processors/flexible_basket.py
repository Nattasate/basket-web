# -*- coding: utf-8 -*-  # ระบุ encoding เพื่อรองรับคอมเมนต์/สตริงภาษาไทยอย่างปลอดภัย

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
"""  # ↑ docstring: อธิบายจุดประสงค์/คุณสมบัติ/วิธีใช้ของโมดูล (ไม่มีผลต่อการทำงาน)

from __future__ import annotations  # อนุญาตใช้ type hints ของอนาคต (เช่น -> Tuple[pd.DataFrame,...]) ใน Python เวอร์ชันก่อนหน้า
import os                           # ใช้จัดการ path ชื่อไฟล์ ส่วนขยายไฟล์
import json                         # (สำรอง) หากต้อง serialize/deserialize JSON
import math                         # ใช้ฟังก์ชันคณิตศาสตร์พื้นฐาน (อาจใช้ตรวจ inf/nan ที่อื่นได้)
import itertools                    # ใช้สร้างคอมบิเนชัน/เพอร์มิวเทชัน (สำคัญกับ Apriori)
import re                           # ใช้ regex สำหรับ normalize ชื่อคอลัมน์
from typing import Dict, List, Tuple, Optional, Set, Any  # ใช้ระบุชนิดข้อมูลเพื่ออ่าน/ดูแลโค้ดง่าย
from dataclasses import dataclass    # ใช้สร้างคลาสข้อมูลแบบเบา ๆ (DetectResult)

import pandas as pd                 # ไลบรารีตารางข้อมูลหลัก
import numpy as np                  # ไลบรารีตัวเลข/อาเรย์ ใช้บ่อยกับ NaN/เวคเตอร์

# -----------------------------
# Column detection heuristics   # ส่วน "ฮิวริสติก" เดาชื่อคอลัมน์จากคำพ้อง
# -----------------------------

ITEM_SYNONYMS = [  # รายชื่อคำพ้องที่น่าจะหมายถึง "สินค้า" (ทั้ง EN/TH และรูปแบบสะกดต่าง ๆ)
    "itemdescription","item","items","product","productname","product_name","sku","description","product title",
    "ชื่อสินค้า","สินค้า","ชื่อ","รายการ","รายการสินค้า","tag","tags","label","category","categories"
]
ORDER_SYNONYMS = [  # รายชื่อคำพ้องที่น่าจะหมายถึง "ออเดอร์/ใบเสร็จ/ธุรกรรม"
    "order_id","orderid","invoice","invoiceno","invoicenumber","receipt","billno","transaction","transaction_id",
    "basketid","basket","single_transaction","เลขที่ใบเสร็จ","เลขที่คำสั่งซื้อ","order","orderno","order no","idออเดอร์"
]
CUSTOMER_SYNONYMS = [  # รายชื่อคำพ้องที่น่าจะหมายถึง "ลูกค้า/ผู้ใช้/สมาชิก"
    "membernumber","member","customer","customerid","customer_id","userid","buyer","user","client","account",
    "เบอร์","เบอร์โทร","phone","โทรศัพท์","email","อีเมล"
]
DATE_SYNONYMS = [  # รายชื่อคำพ้องที่น่าจะหมายถึง "วันที่/เวลา"
    "date","datetime","timestamp","time","created_at","order_date","invoicedate","วันที่","วันเวลา"
]

LIST_FORMAT_SYNONYMS = [  # รายชื่อคำพ้องที่น่าจะหมายถึงคอลัมน์ "รายการรวม" (กรณี list-format)
    "items","order_items","รายการสินค้า","products","tags","tag","categories","category"
]

NON_ALPHA_NUM = re.compile(r"[^a-z0-9]+")  # regex เพื่อตัดอักขระที่ไม่ใช่ a-z/0-9 (ใช้ normalize ชื่อคอลัมน์)

def norm(s: str) -> str:
    return NON_ALPHA_NUM.sub("", str(s).strip().lower())  # แปลงสตริงเป็น lower, ตัดเว้นวรรค, ลบอักขระพิเศษทั้งหมด

def guess_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    cols = list(df.columns)                                 # รายชื่อคอลัมน์จริงใน DataFrame
    norm_map = {col: norm(col) for col in cols}             # แม็ปคอลัมน์จริงเป็นเวอร์ชัน normalize
    cand_norms = set([norm(c) for c in candidates])         # เซ็ตของ candidate หลัง normalize
    # direct exact match first
    for col in cols:                                        # พยายามจับคู่แบบตรงตัว (หลัง normalize) ก่อน
        if norm_map[col] in cand_norms:
            return col                                      # เจอแล้วคืนชื่อคอลัมน์จริง
    # partial / contains match
    for col in cols:                                        # ถ้าไม่เจอ exact match ให้ลองแบบ "มีอยู่ในกันและกัน"
        n = norm_map[col]
        for c in cand_norms:
            if c and (c in n or n in c):                    # เช่น "orderid" มีใน "order_id" หรือกลับกัน
                return col
    return None                                             # ไม่พบคอลัมน์ที่เข้าข่าย

# ----------------------------------
# Transaction building helpers       # ฟังก์ชันช่วยเตรียมข้อมูลเป็น long format (trans, item)
# ----------------------------------

def ensure_string_col(df: pd.DataFrame, col: str) -> pd.Series:
    s = df[col]                                             # ดึงซีรีส์ตามชื่อคอลัมน์
    if isinstance(s, pd.DataFrame):                         # หากเกิดกรณีชื่อซ้ำจนได้ DataFrame
        s = s.iloc[:, 0]                                    # เลือกคอลัมน์แรกมาใช้งาน
    s = s.astype(str)                                       # บังคับเป็นสตริง
    s = s.str.strip()                                       # ตัดช่องว่างหัวท้าย
    return s                                                # คืนซีรีส์สตริงสะอาด

def parse_date_maybe(s: pd.Series) -> pd.Series:
    try:
        d = pd.to_datetime(s, errors="coerce")              # พยายามแปลงเป็น datetime (ผิดเป็น NaT)
        # normalize to date only to avoid over-fragmenting baskets
        return d.dt.date.astype(str)                        # ใช้เฉพาะ "วันที่" (ลดการแตกธุรกรรมยิบย่อย)
    except Exception:
        return s                                            # ถ้าแปลงไม่ได้ คืนค่าดั้งเดิม

def explode_list_column(df: pd.DataFrame, items_col: str) -> pd.DataFrame:
    # split by comma/semicolon/| and explode
    series = df[items_col]                                  # ดึงคอลัมน์รายการรวม (เช่น "Milk, Bread; Egg")
    if isinstance(series, pd.DataFrame):                    # กรณีผิดปกติได้ DataFrame
        series = series.iloc[:, 0]                          # ใช้คอลัมน์แรก
    split = (
        series
        .astype(str)
        .str.split(r"[,\|;]+", expand=False)                # แยกด้วย , | ; ให้เป็นลิสต์
        .apply(lambda lst: [x.strip() for x in lst if str(x).strip() != ""] if isinstance(lst, list) else [])
        # ↑ ทำความสะอาดแต่ละ token: strip แล้วตัดว่าง
    )
    out = df.copy()                                         # ทำงานบนสำเนา
    out[items_col] = split                                  # แทนที่คอลัมน์ด้วยลิสต์ที่แยกแล้ว
    out = out.explode(items_col).rename(columns={items_col: "__item__"})
    # ↑ แตกแถว: 1 รายการ/แถว แล้วรีเนมคอลัมน์เป็น __item__
    out = out[out["__item__"].notna() & (out["__item__"].astype(str).str.strip() != "")]
    # ↑ กรองค่า NaN/ว่าง ออก
    return out                                              # คืน DataFrame long ที่มีคอลัมน์ __item__

@dataclass
class DetectResult:                                         # โครงข้อมูลเก็บผลการเดาคอลัมน์
    item_col: Optional[str]
    order_col: Optional[str]
    customer_col: Optional[str]
    date_col: Optional[str]
    used_list_mode: bool

def detect_columns(df: pd.DataFrame) -> DetectResult:
    # Try list-format first (one row/order, items list in a single col)
    list_col = guess_column(df, LIST_FORMAT_SYNONYMS)       # เดาคอลัมน์รายการรวม (บ่ง list-mode)
    item_col = guess_column(df, ITEM_SYNONYMS)              # เดาคอลัมน์สินค้า (สำหรับ long-mode)
    order_col = guess_column(df, ORDER_SYNONYMS)            # เดาคอลัมน์ออเดอร์/ใบเสร็จ
    cust_col  = guess_column(df, CUSTOMER_SYNONYMS)         # เดาคอลัมน์ลูกค้า
    date_col  = guess_column(df, DATE_SYNONYMS)             # เดาคอลัมน์วันที่

    used_list_mode = False                                  # ธงว่ากำลังใช้ list-mode หรือไม่
    if list_col is not None and order_col is not None:      # ถ้าพบคอลัมน์รายการรวม + ออเดอร์ → ใช้ list-mode
        used_list_mode = True
        return DetectResult(item_col="__item__", order_col=order_col, customer_col=cust_col, date_col=date_col, used_list_mode=True)

    # If not list mode, we need an item column
    if item_col is None:                                    # ถ้าไม่ใช่ list-mode แล้วหา item ไม่เจอ
        # last resort: if a column has high cardinality and stringy, assume it's item
        str_cols = [c for c in df.columns if df[c].dtype == "object"]  # มองหาคอลัมน์ข้อความ
        if len(str_cols) > 0:
            cand = max(str_cols, key=lambda c: df[c].nunique(dropna=True))  # เลือกคอลัมน์ที่ unique สูงสุด
            item_col = cand

    return DetectResult(item_col=item_col, order_col=order_col, customer_col=cust_col, date_col=date_col, used_list_mode=False)
    # ↑ คืนผลการเดา (long-mode): ระบุคอลัมน์ที่น่าจะเป็น item/order/customer/date

def build_transactions(df: pd.DataFrame, dr: DetectResult) -> Tuple[pd.DataFrame, str, str]:
    """
    Returns (long_df, item_col, trans_col)
    long_df has columns [trans_col, item_col]
    """  # ↑ คำอธิบาย: คืน DataFrame แบบ long (คอลัมน์ธุรกรรม + คอลัมน์สินค้า) และชื่อคอลัมน์ทั้งคู่
    if dr.item_col is None:                                  # ต้องมีคอลัมน์สินค้าเสมอ
        raise ValueError("ไม่พบคอลัมน์สินค้า (item). กรุณาตรวจสอบไฟล์หรือเพิ่มคอลัมน์สินค้าให้ตรวจจับได้")

    working = df.copy()                                      # ทำงานบนสำเนาเพื่อไม่แก้ของเดิม

    # If list-format, explode first
    if dr.used_list_mode:                                    # ถ้าอยู่ใน list-mode
        working = explode_list_column(working, guess_column(df, LIST_FORMAT_SYNONYMS))  # แตกแถวเป็น long
        item_col = "__item__"                                # กำหนดชื่อคอลัมน์สินค้าเป็น __item__
    else:
        item_col = dr.item_col                               # long-mode ใช้คอลัมน์สินค้าที่เดามา

    # Determine transaction id column
    trans_col = None
    if dr.order_col is not None:                             # กรณีมีคอลัมน์ออเดอร์ → ใช้เป็นรหัสธุรกรรม
        trans_col = dr.order_col
    elif dr.customer_col is not None and dr.date_col is not None:
        # combine customer + date as transaction id
        c = ensure_string_col(working, dr.customer_col)      # รวมลูกค้า + วันที่ เป็นคีย์ธุรกรรม
        d = parse_date_maybe(ensure_string_col(working, dr.date_col))
        trans_col = "__customer_date__"
        working[trans_col] = (c.fillna("") + "|" + d.fillna(""))  # รูปแบบ "cust|YYYY-MM-DD"
    elif dr.customer_col is not None:                        # มีเฉพาะลูกค้า → ใช้ลูกค้าเป็นกรุ๊ป
        trans_col = dr.customer_col
    elif dr.date_col is not None:                            # มีเฉพาะวันที่ → ใช้วันที่เป็นกรุ๊ป (fallback)
        # group by date as a last resort
        d = parse_date_maybe(ensure_string_col(working, dr.date_col))
        trans_col = "__date__"
        working[trans_col] = d
    else:
        # Fallback: create a rolling transaction id every N rows (very rough)
        trans_col = "__rowgroup__"                           # ไม่มีอะไรเลย → กลุ่มละ 5 แถว (หยาบ ๆ เพื่อไม่ล้ม)
        working[trans_col] = (np.arange(len(working)) // 5).astype(str)

    # Clean items/trans
    working = working[[trans_col, item_col]].copy()          # เหลือเฉพาะ 2 คอลัมน์ที่ต้องใช้จริง

    # If duplicate-named columns created DataFrames on selection, reduce to first actual Series
    if isinstance(working[item_col], pd.DataFrame):          # ถ้ากลายเป็น DataFrame เพราะชื่อซ้ำ
        working[item_col] = working[item_col].iloc[:, 0]     # เอาคอลัมน์แรก
    if isinstance(working[trans_col], pd.DataFrame):
        working[trans_col] = working[trans_col].iloc[:, 0]

    working[item_col] = working[item_col].astype(str).str.strip()  # สินค้าเป็นสตริง ตัดช่องว่าง
    working = working[working[item_col] != ""]                     # กรองค่าว่างออก
    working = working.dropna(subset=[trans_col, item_col])         # ตัด NaN ใน 2 คอลัมน์หลัก

    # Deduplicate (same item repeated within same transaction)
    working = working.drop_duplicates(subset=[trans_col, item_col])  # ลบสินค้าเดิมซ้ำในธุรกรรมเดียวกัน

    return working, item_col, trans_col                           # คืน long_df และชื่อคอลัมน์ที่ใช้

# ----------------------------------
# Apriori (pure Python)             # อัลกอริทึม Apriori ที่เขียนเองด้วย Python ล้วน
# ----------------------------------

def _generate_candidates(prev_frequents: List[frozenset], k: int) -> Set[frozenset]:
    """ Join step: generate C_k from L_{k-1} """
    cands = set()                                            # เซ็ตเก็บผู้สมัคร C_k
    n = len(prev_frequents)                                  # จำนวนชุด frequent ขนาด k-1
    for i in range(n):                                       # ลูปจับคู่ทุกชุด i<j
        for j in range(i+1, n):
            a = prev_frequents[i]
            b = prev_frequents[j]
            union = a | b                                    # รวมสองชุด (union)
            if len(union) == k:                              # ต้องได้ขนาด k เท่านั้น
                # prune: all subsets must be frequent
                all_subsets_ok = True
                for subset in itertools.combinations(union, k-1):  # เช็คทุก subset ขนาด k-1
                    if frozenset(subset) not in prev_frequents:    # ถ้า subset ไหนไม่ frequent → ตัดทิ้ง
                        all_subsets_ok = False
                        break
                if all_subsets_ok:
                    cands.add(union)                         # ผ่านเงื่อนไข → เพิ่มเป็นผู้สมัคร
    return cands

def _count_support(candidates: Set[frozenset], transactions: List[Set[str]]) -> Dict[frozenset, float]:
    counts = {c: 0 for c in candidates}                      # ตัวนับจำนวนธุรกรรมที่มีชุดผู้สมัคร
    n = float(len(transactions))                             # จำนวนธุรกรรมทั้งหมด (เป็น float เผื่อหาร)
    for t in transactions:                                   # วนทุกธุรกรรม (เซ็ตของสินค้า)
        for c in candidates:
            if c.issubset(t):                                # ถ้าชุดผู้สมัครเป็น subset ของธุรกรรมนั้น
                counts[c] += 1                               # เพิ่มนับ
    # convert to support
    return {k: v/n for k, v in counts.items() if v > 0}      # แปลงเป็น support (สัดส่วน) ตัดตัวที่นับได้ 0 ออก

def apriori(transactions: List[Set[str]], min_support: float=0.001) -> Dict[int, Dict[frozenset, float]]:
    """Return dictionary k -> {itemset: support} of frequent itemsets."""
    # 1-itemsets
    item_counts = {}                                         # นับความถี่ของสินค้าเดี่ยว
    n = float(len(transactions))                             # จำนวนธุรกรรมทั้งหมด
    for t in transactions:
        for i in t:
            item_counts[i] = item_counts.get(i, 0) + 1       # เพิ่มตัวนับของสินค้า i
    L1 = {frozenset([i]): c/n for i, c in item_counts.items() if (c/n) >= min_support}
    # ↑ สร้าง frequent itemsets ขนาด 1 โดยกรองตาม min_support
    frequents = {1: L1}                                      # เก็บเป็นระดับ k -> dict(itemset: support)
    k = 2                                                    # เริ่มเตรียมสำหรับขนาด 2
    prev = list(L1.keys())                                   # รายการ frequent ของ k-1 (ตอนนี้คือ 1)

    while prev:                                              # วนจนกว่าจะไม่มี frequent ของรอบก่อนหน้า
        Ck = _generate_candidates(prev, k)                   # สร้างผู้สมัคร C_k
        Sk = _count_support(Ck, transactions)                # นับ support ของ C_k
        Lk = {s: sup for s, sup in Sk.items() if sup >= min_support}  # กรองเป็น L_k
        if not Lk:                                           # ถ้าไม่มีชุดผ่านเกณฑ์
            break                                            # หยุดลูป
        frequents[k] = Lk                                    # เก็บ L_k
        prev = list(Lk.keys())                               # อัพเดทรายการ frequent ของรอบถัดไป
        k += 1                                               # เพิ่มขนาดชุด (k)

    return frequents                                         # คืน dict ของ frequent itemsets แยกตามขนาด

def generate_rules(frequents: Dict[int, Dict[frozenset, float]], min_lift: float=1.0) -> List[Dict[str, Any]]:
    """Generate association rules from frequent itemsets with standard metrics."""
    # Build a support lookup for convenience
    support_lookup = {}                                      # ตาราง lookup → support(itemset)
    for k, level in frequents.items():
        for itemset, sup in level.items():
            support_lookup[itemset] = sup

    rules = []                                               # เก็บรายการกฎทั้งหมด
    for k, level in frequents.items():                       # พิจารณาแต่ละขนาดชุด
        if k < 2:                                            # ต้องอย่างน้อย 2 รายการถึงจะแยกซ้าย/ขวาได้
            continue
        for itemset, supp_ab in level.items():               # supp_ab = support(A∪B)
            items = list(itemset)
            # all non-empty proper subsets
            for r in range(1, len(items)):                   # ขนาดฝั่งซ้าย: 1..len-1
                for antecedent in itertools.combinations(items, r):
                    antecedent = frozenset(antecedent)       # A
                    consequent = itemset - antecedent        # B = AB \ A
                    if not consequent:                       # ถ้า B ว่าง ให้ข้าม
                        continue
                    supp_a = support_lookup.get(antecedent, 0.0)   # support(A)
                    supp_b = support_lookup.get(consequent, 0.0)   # support(B)
                    if supp_a == 0 or supp_b == 0:                 # ถ้า support ฝั่งใดเป็น 0 → คำนวณไม่ได้
                        continue
                    confidence = supp_ab / supp_a if supp_a > 0 else 0.0  # conf = supp(AB)/supp(A)
                    lift = confidence / supp_b if supp_b > 0 else float("inf")  # lift = conf / supp(B)
                    if lift < min_lift:                              # กรองตาม min_lift
                        continue
                    rules.append({
                        "antecedents": tuple(sorted(list(antecedent))),  # เก็บ A เป็น tuple (เรียงแล้ว)
                        "consequents": tuple(sorted(list(consequent))),  # เก็บ B เป็น tuple (เรียงแล้ว)
                        "support": supp_ab,                              # supp(AB)
                        "confidence": confidence,                         # conf
                        "lift": lift,                                     # lift
                    })
    # Sort by lift desc then confidence desc
    rules.sort(key=lambda x: (x["lift"], x["confidence"], x["support"]), reverse=True)  # เรียงโดยเน้น lift > conf > supp
    return rules                                              # คืนลิสต์ของกฎ

# ----------------------------------
# Public API                         # ฟังก์ชันระดับสูงสำหรับใช้งานจากภายนอก
# ----------------------------------

def analyze_dataframe(df: pd.DataFrame,
                      min_support: float=0.001,
                      min_lift: float=1.0) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Returns (rules_df, frequent_itemsets_df, meta)
    """  # ↑ คืน 3 ส่วน: ตารางกฎ, ตาราง frequent itemsets, และเมตาดาต้า
    dr = detect_columns(df)                                   # เดาคอลัมน์สำคัญจากฮิวริสติก
    long_df, item_col, trans_col = build_transactions(df, dr) # สร้างตาราง long (ธุรกรรม × สินค้า)

    # Build transactions (list of sets)
    transactions = (
        long_df.groupby(trans_col)[item_col]                  # รวมรายการตามรหัสธุรกรรม
        .apply(lambda s: set([str(x) for x in s.values if pd.notna(x) and str(x).strip() != ""]))
        .tolist()
    )  # ↑ ได้เป็น list ของเซ็ต แต่ละเซ็ตคือรายการสินค้าภายในธุรกรรมหนึ่ง
    # Apriori
    freqs = apriori(transactions, min_support=min_support)    # หา frequent itemsets ตาม min_support
    rules = generate_rules(freqs, min_lift=min_lift)          # สร้างกฎจาก frequent itemsets (กรองด้วย min_lift)

    # Convert frequents to DataFrame
    rows = []                                                 # เตรียมเก็บแถวสำหรับ frequent itemsets
    for k, level in freqs.items():
        for itemset, sup in level.items():
            rows.append({
                "itemset": tuple(sorted(list(itemset))),      # แปลง itemset เป็น tuple เรียงแล้ว (อ่านง่าย/เสถียร)
                "length": k,                                  # ขนาดของชุด
                "support": sup                                # ค่า support
            })
    fi_df = pd.DataFrame(rows)                                # แปลงเป็น DataFrame
    if not fi_df.empty:
        fi_df = fi_df.sort_values(["length","support"], ascending=[True, False]).reset_index(drop=True)
        # ↑ เรียงเพื่อให้อ่านง่าย: ชุดสั้นก่อน (length น้อย→มาก) และในขนาดเดียวกันเรียงตาม support มาก→น้อย
    rules_df = pd.DataFrame(rules)                            # ตารางกฎ (แต่ละแถวเป็นกฎหนึ่งข้อ)

    meta = {                                                  # เมตาดาต้าสำหรับเช็ค/โชว์ใน UI
        "detected_item_col": item_col,                        # คอลัมน์สินค้าที่ใช้จริง
        "detected_trans_col": trans_col,                      # คอลัมน์ธุรกรรมที่ใช้จริง
        "heuristics": {
            "order_col": dr.order_col,                        # คอลัมน์ออเดอร์ (ถ้าจับได้)
            "customer_col": dr.customer_col,                  # คอลัมน์ลูกค้า (ถ้าจับได้)
            "date_col": dr.date_col,                          # คอลัมน์วันที่ (ถ้าจับได้)
            "used_list_mode": dr.used_list_mode               # ใช้ list-mode หรือไม่
        },
        "n_transactions": len(transactions),                  # จำนวนธุรกรรมทั้งหมด
        "n_unique_items": int(long_df[item_col].nunique())    # จำนวนสินค้ายูนีกทั้งหมด
    }
    return rules_df, fi_df, meta                              # ส่งกลับ 3 ส่วนให้ผู้เรียกใช้งาน

def _dedupe_columns(df: pd.DataFrame) -> pd.DataFrame:
    seen = {}                                                 # เก็บตัวนับชื่อคอลัมน์ที่ซ้ำ
    new_cols = []                                             # ชื่อคอลัมน์ชุดใหม่หลังแก้ซ้ำ
    for c in df.columns:
        s = str(c)
        if s in seen:                                         # ถ้าชื่อนี้เคยเห็นแล้ว
            seen[s] += 1
            new_cols.append(f"{s}.{seen[s]}")                 # เติม .1 .2 ... ต่อท้ายเพื่อลดชน
        else:
            seen[s] = 0
            new_cols.append(s)
    df.columns = new_cols                                     # เซ็ตกลับเข้า DataFrame
    return df

def read_any(path: str, sep: Optional[str]="auto", sheet: Optional[str]=None) -> pd.DataFrame:
    ext = os.path.splitext(path)[1].lower()                   # แยกนามสกุลไฟล์ (เช่น .csv/.xlsx)
    if ext in [".xls", ".xlsx", ".xlsm"]:
        df = pd.read_excel(path, sheet_name=sheet)            # อ่าน Excel (กำหนด sheet ได้)
        return _dedupe_columns(df)                            # แก้ชื่อคอลัมน์ซ้ำก่อนคืน
    elif ext in [".csv", ".txt", ".tsv"]:
        if sep == "auto":
            # try common seps
            for s in [",","\t",";","|"]:                      # ลองตัวคั่นยอดนิยม: คอมมา/แท็บ/เซมิโคลอน/พายป์
                try:
                    df = pd.read_csv(path, sep=s, engine="python", on_bad_lines="skip")
                    if df.shape[1] > 0:                       # ถ้าอ่านแล้วมีคอลัมน์จริง
                        return _dedupe_columns(df)
                except Exception:
                    continue                                  # ถ้าล้มเหลวกับตัวคั่นนี้ ให้ลองตัวถัดไป
            # fallback
            df = pd.read_csv(path, engine="python", on_bad_lines="skip")  # ให้ pandas เดาเอง
            return _dedupe_columns(df)
        else:
            df = pd.read_csv(path, sep=sep, engine="python", on_bad_lines="skip")  # ผู้ใช้ระบุตัวคั่นเอง
            return _dedupe_columns(df)
    else:
        # try csv anyway
        df = pd.read_csv(path, engine="python", on_bad_lines="skip")      # ถ้าไม่รู้จักนามสกุล ลองอ่านแบบ CSV
        return _dedupe_columns(df)

def analyze_file(path: str,
                 min_support: float=0.001,
                 min_lift: float=1.0,
                 sep: Optional[str]="auto",
                 sheet: Optional[str]=None) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    df = read_any(path, sep=sep, sheet=sheet)                 # อ่านไฟล์เป็น DataFrame โดยเดาตัวคั่น/ชีตอัตโนมัติ
    return analyze_dataframe(df, min_support=min_support, min_lift=min_lift)  # วิเคราะห์และคืนผลลัพธ์ 3 ส่วน
