function sheet_to_array(sheet){
    var out = [];
    if(sheet == null || sheet["!ref"] == null) return out;
    var r = XLS.utils.decode_range(sheet["!ref"]);
    var row, rr = "", cols = [];
    var i = 0, cc = 0, val;
    var R = 0, C = 0;
    for(C = r.s.c; C <= r.e.c; ++C) cols[C] = XLS.utils.encode_col(C);
    for(R = r.s.r; R <= r.e.r; ++R) {
        row = [];
        rr = XLS.utils.encode_row(R);
        for(C = r.s.c; C <= r.e.c; ++C) {
            val = sheet[cols[C] + rr];
            val = val !== undefined ? ''+XLS.utils.format_cell(val) : "";
            row[C] = val;
        }
        out.push(row);
    }
    return out;
}

