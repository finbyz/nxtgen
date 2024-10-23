import frappe
from frappe import _

@frappe.whitelist()
def get_sales_data(item_code, from_date, to_date):
    if not item_code or not from_date or not to_date:
        frappe.throw(_("Item code, From Date, and To Date are required."))

    sales_invoices = frappe.db.sql("""
        SELECT
            COUNT(DISTINCT si.name) as total_invoices,
            SUM(sii.qty) as total_qty
        FROM
            `tabSales Invoice` si
        JOIN
            `tabSales Invoice Item` sii ON sii.parent = si.name
        WHERE
            sii.item_code = %s
            AND si.posting_date BETWEEN %s AND %s
            AND si.docstatus = 1
    """, (item_code, from_date, to_date), as_dict=True)

    if sales_invoices:
        return {
            "total_invoices": sales_invoices[0].get('total_invoices', 0),
            "total_qty": sales_invoices[0].get('total_qty', 0)
        }
    else:
        return {"total_invoices": 0, "total_qty": 0}
