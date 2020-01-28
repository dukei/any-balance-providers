/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {};

function main() {
    var prefs = AnyBalance.getPreferences();
    g_headers = {
        'Content-Type': 'application/json;charset=windows-1251',
        'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Connection': 'close',
        'X-Token': prefs.token,
        'User-Agent': 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
    };
    var result = {
        success: true,
        balance:0,
        limit:0,
        html:''
    };
    var response = AnyBalance.requestGet('https://api.monobank.ua/personal/client-info', g_headers);
    var json = getJson(response).accounts;
    for (var i = 0; i < json.length; i++) {
        result.balance+=json[i].balance;
        result.limit+=json[i].creditLimit;
        result.html+=History(json[i].id);
    };
    result.balance-=result.limit;
    result.balance/=100;
    result.limit/=100;
    result.__tarif=getFormattedDate('DD.MM.YYYY HH:NN');
    AnyBalance.setResult(result);
};

function History(iban) {
    var d=new Date();
    d.setDate(d.getDate()-3)
    var response = AnyBalance.requestGet('https://api.monobank.ua/personal/statement/'+iban+'/'+d*1, g_headers);
    if (AnyBalance.getData('hist_'+iban)==response) return AnyBalance.getData('html_'+iban);
    var json = getJson(response);
    var res = '';
    for (var i = 0; i < json.length; i++) {
        var t = json[i];
        var s=t.amount;
            res += '<font  color=#1e3b24><strong>'+s/100;
            if (s<0) res=res.replace('1e3b24','B00000');
            if (t.operationAmount!=t.amount) res+=' (' + t.operationAmount/100+')'
            res +=  '</strong></font> ' + getFormattedDate('DD.MM.YYYY HH:NN:SS',new Date(t.time*1000)) + '<BR><small>' + t.description + '<br>'
            if (t.commissionRate>0) res+=' Комиссия: '+t.commissionRate/100;
            if (t.cashbackAmount>0) res+=' Кешбэк: '+t.cashbackAmount/100;
            res+=' Баланс: '+t.balance/100;
            res +='</small><br>';
        }
    AnyBalance.setData('hist_'+iban,response);
    AnyBalance.setData('html_'+iban,res);
    AnyBalance.saveData();
    return res;
}