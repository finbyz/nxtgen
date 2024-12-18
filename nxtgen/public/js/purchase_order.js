frappe.ui.form.on('Purchase Order Item', {
    view_invoice: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];

        let d = new frappe.ui.Dialog({
            title: 'Select Date Range',
            fields: [
                {
                    label: 'Item Code',
                    fieldname: 'item_code',
                    fieldtype: 'Link', 
                    options: 'Item',    
                    default: row.item_code,
                    read_only: 1
                },
                {
                    label: 'Item Name',
                    fieldname: 'item_name',
                    fieldtype: 'Data',
                    default: row.item_name,
                    read_only: 1
                },
                {
                    label: 'Date Range',
                    fieldname: 'date_range',
                    fieldtype: 'DateRange',
                    reqd: 1
                },
                {
                    fieldname: 'results_table',
                    fieldtype: 'HTML'
                }
            ],
            size: 'small',
            primary_action_label: 'Submit',
            primary_action(values) {
                const [from_date, to_date] = values.date_range || [];

                if (!from_date || !to_date) {
                    frappe.msgprint(__('Please select both From and To dates.'));
                    return;
                }

                frappe.call({
                    method: "nxtgen.nxtgen.doc_events.purchase_order.get_sales_data",
                    args: {
                        item_code: row.item_code,
                        from_date: from_date,
                        to_date: to_date
                    },
                    callback: function (response) {
                        if (response && response.message) {
                            const { total_invoices, total_qty } = response.message;

                            const quantity = total_qty === null ? 0 : total_qty;

                            const tableHTML = `
                                <table class="table table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Item Code</th>
                                            <th>Total Invoices</th>
                                            <th>Total Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>${row.item_code}</td>
                                            <td>${total_invoices}</td>
                                            <td>${quantity}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            `;
                            d.get_field('results_table').$wrapper.html(tableHTML);
                        } else {
                            frappe.msgprint(__('No data found for the selected date range.'));
                        }
                    }
                });

                const submit_button = d.$wrapper.find('.btn-primary');
                submit_button.hide();
            }
        });

        d.set_primary_action('Submit', () => {}, 'btn-secondary');
        const submit_button = d.$wrapper.find('.btn-primary');
        submit_button.hide();

        d.fields_dict['date_range'].df.onchange = function () {
            submit_button.show();
            d.set_primary_action('Submit', () => d.primary_action(d.get_values()));
        };

        d.show();
    },
});
frappe.ui.form.on("Purchase Order", {
    // Trigger on item_code change in the child table
    item_code: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        fetchAndSetDataForItem(frm, row);
    },
    
    // Trigger on transaction_date change in the main form
    transaction_date: function(frm) {
        frm.doc.items.forEach(row => {
            fetchAndSetDataForItem(frm, row);
        });
    },

    // Trigger on form validate
    validate: function(frm) {
        frm.doc.items.forEach(row => {
            fetchAndSetDataForItem(frm, row);
        });
    }
});

function fetchAndSetDataForItem(frm, row) {
    const today = frm.doc.transaction_date;
    const days_ago = {
        7: frappe.datetime.add_days(today, -7),
        15: frappe.datetime.add_days(today, -15),
        30: frappe.datetime.add_days(today, -30)
    };

    // Function to fetch data and set it in the row fields
    const fetchAndSetData = (days) => {
        frappe.call({
            method: "nxtgen.nxtgen.doc_events.purchase_order.get_sales_data",
            args: {
                item_code: row.item_code,
                from_date: days_ago[days],
                to_date: today
            },
            callback: function(response) {
                if (response.message) {
                    const data = response.message;
                    if (days === "7") {
                        frappe.model.set_value(row.doctype, row.name, "qty_in_last_7_days", data.total_qty || 0);
                    } else if (days === "15") {
                        frappe.model.set_value(row.doctype, row.name, "qty_in_last_15_days", data.total_qty || 0);
                    } else if (days === "30") {
                        frappe.model.set_value(row.doctype, row.name, "qty_in_last_30_days", data.total_qty || 0);
                    }
                }
            }
        });
    };

    ["7", "15", "30"].forEach(fetchAndSetData);
}