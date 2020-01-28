/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {};

function main() {
    var prefs = AnyBalance.getPreferences();
    g_headers = {
        'Content-Type': 'application/json;charset=windows-1251',
        'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
        'id': prefs.id,
        'Connection': 'close',
        'token': prefs.token,
        'User-Agent': 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
    };
    var result = {
        success: true,
        balance: 0,
        tbalance: 0,
        ubalance: 0,
        dbalance: 0,
        lbalance: 0,
        html:''
    };
    var response = AnyBalance.requestGet('https://acp.privatbank.ua/api/proxy/rest/today', g_headers);
    var json = getJson(response).balanceResponse;
    for (var i = 0; i < json.length; i++) {
        var t = json[i][Object.keys(json[i])[0]];
        if ('DT'.indexOf(t.atp) > -1) result.balance += parseFloat(t.balanceOut);
        if ('DTUL'.indexOf(t.atp) > -1) result[t.atp.toLowerCase() + 'balance'] += parseFloat(t.balanceOut);
        if(AnyBalance.isAvailable('html')){
	       if (t.atp == 'T' && t.state == 'a') result.html += History(Object.keys(json[i])[0]);
        }
    };
    for (key in result) {
        if (key.indexOf('balance') > -1) result[key] = Math.floor(result[key] * 100) / 100
    }
    result.__tarif=getFormattedDate('DD.MM.YYYY HH:NN')
    AnyBalance.setResult(result);
};

function History(iban) {
    var response = AnyBalance.requestGet('https://acp.privatbank.ua/api/proxy/transactions?acc=' + iban + '&startDate=' + getFormattedDate({format:'DD-MM-YYYY',offsetDay:3}) + '&endDate=' + getFormattedDate('DD-MM-YYYY'), g_headers);
    if (AnyBalance.getData('hist_'+iban)==response) return AnyBalance.getData('html_'+iban);
    var json = getJson(response).StatementsResponse.statements;
    json.sort (function(a, b) {
    	a=a[Object.keys(a)[0]];
    	b=b[Object.keys(b)[0]];
    	return new Date(b.BPL_DAT_OD.replace(/(\d+)\.(\d+)\.(\d+)/, '$3-$2-$1')+ ' ' +b.BPL_TIM_P) - new Date(a.BPL_DAT_OD.replace(/(\d+)\.(\d+)\.(\d+)/, '$3-$2-$1')+ ' ' +a.BPL_TIM_P);
    });
    var ret='';
    for (var i = 0; i < json.length; i++) {
        var t = json[i][Object.keys(json[i])[0]];
        var res = '';
        if (t.BPL_PR_PR == 'r' && t.BPL_FL_REAL == 'r') {
            res += '<font  color=#1e3b24><strong>+';
            if (t.TRANTYPE == "D") res=res.replace('1e3b24','B00000').replace('+','-');
            res += t.BPL_SUM_E + '</strong></font> ' + t.BPL_DAT_OD + ' ' + t.BPL_TIM_P + '<BR><small>' + t.AUT_CNTR_NAM + '<br>' + t.BPL_OSND + '</small><br><br>';
        }
        ret=ret+res;
    };
    AnyBalance.setData('hist_'+iban,response);
    AnyBalance.setData('html_'+iban,ret);
    AnyBalance.saveData();
    return ret;
}