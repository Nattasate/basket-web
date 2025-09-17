
"""
Basket analyzer (flex version): wraps flexible_basket to keep the same API that app.py expects.
- Auto-detects columns for item/order/customer/date (+list-mode via items/tags/categories)
- No mlxtend dependency
"""
import pandas as pd
import math
import numpy as np
from . import flexible_basket as fb

class BasketAnalyzer:
    def __init__(self, min_support: float = 0.001, min_lift: float = 1.0):
        self.min_support = float(min_support)
        self.min_lift = float(min_lift)

    def analyze_basket(self, selected_df: pd.DataFrame, original_df: pd.DataFrame):
        """
        Keep signature compatible with the old app.py.
        Returns a dict with keys used by create_download_files():
          - success, type='basket', meta, rulesTable, singleRulesTable, frequentItemsetsTable
        """
        try:
            # If user selected subset columns, use that, else use original_df
            df = selected_df if selected_df is not None and not selected_df.empty else original_df
            if df is None or df.empty:
                return {'success': False, 'error': 'Empty dataframe', 'type': 'basket'}

            # Run analysis
            rules_df, fi_df, meta = fb.analyze_dataframe(
                df,
                min_support=self.min_support,
                min_lift=self.min_lift
            )

            # Helper to make numbers JSON-safe (no NaN/Infinity)
            def safe_num(x, ndigits=6):
                try:
                    v = float(x)
                except Exception:
                    return None
                # Treat NaN/inf as None to keep valid JSON
                if (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) or (
                    isinstance(x, (np.floating,)) and (np.isnan(x) or np.isinf(x))
                ):
                    return None
                try:
                    return round(v, ndigits)
                except Exception:
                    return v

            # Prepare tables for frontend/exporter
            # Association Rules table
            rulesTable = []
            if not rules_df.empty:
                for i, row in rules_df.iterrows():
                    # pretty print tuples
                    ant = ", ".join(list(row['antecedents'])) if isinstance(row['antecedents'], (list, tuple)) else str(row['antecedents'])
                    con = ", ".join(list(row['consequents'])) if isinstance(row['consequents'], (list, tuple)) else str(row['consequents'])
                    rulesTable.append({
                        "Antecedents": ant,
                        "Consequents": con,
                        "Support": safe_num(row.get("support", 0.0)),
                        "Confidence": safe_num(row.get("confidence", 0.0)),
                        "Lift": safe_num(row.get("lift", 0.0)),
                    })

            # Frequent Itemsets table
            frequentItemsetsTable = []
            if not fi_df.empty:
                for i, row in fi_df.iterrows():
                    it = row.get("itemset")
                    if isinstance(it, (list, tuple)):
                        items = ", ".join(list(it))
                    else:
                        items = str(it)
                    frequentItemsetsTable.append({
                        "Itemset": items,
                        "Length": int(row.get("length", 0)),
                        "Support": safe_num(row.get("support", 0.0))
                    })

            # Single item "rules" (optional, for UI compatibility) => Top-20 items by support as 1→null
            singleRulesTable = []
            if not fi_df.empty:
                single = fi_df[fi_df["length"]==1].head(20)
                for i, row in single.iterrows():
                    it = row.get("itemset")
                    items = ", ".join(list(it)) if isinstance(it, (list, tuple)) else str(it)
                    singleRulesTable.append({
                        "Antecedents": items,
                        "Consequents": "",
                        "Support": round(float(row.get("support", 0.0)), 6),
                        "Confidence": "",
                        "Lift": "",
                    })

            # Totals for summary widgets/downloads
            total_rules = len(rulesTable)
            total_freq_itemsets = int(len(fi_df)) if isinstance(fi_df, pd.DataFrame) else 0
            total_transactions = int(meta.get("n_transactions", 0))
            total_items = int(meta.get("n_unique_items", 0))

            output = {
                "success": True,
                "type": "basket",
                "meta": {
                    "detectedItemCol": meta.get("detected_item_col"),
                    "detectedTransCol": meta.get("detected_trans_col"),
                    "nTransactions": meta.get("n_transactions", 0),
                    "nUniqueItems": meta.get("n_unique_items", 0),
                    "heuristics": meta.get("heuristics", {}),
                    "minSupport": self.min_support,
                    "minLift": self.min_lift
                },
                # analysis metadata (used by UI label)
                "analysis": {
                    "method": "flex_apriori",
                    "engine": "python",
                    "library": "internal"
                },
                # top-level totals for UI summary
                "totalRules": total_rules,
                "totalTransactions": total_transactions,
                "totalItems": total_items,
                "totalFrequentItemsets": total_freq_itemsets,
                "rulesTable": rulesTable,
                "singleRulesTable": singleRulesTable,
                "frequentItemsetsTable": frequentItemsetsTable
            }
            return output

        except Exception as e:
            return {"success": False, "error": str(e), "type": "basket"}
