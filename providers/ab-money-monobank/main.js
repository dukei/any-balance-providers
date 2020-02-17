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
    result.__tariff=getFormattedDate('DD.MM.YYYY HH:NN');
    AnyBalance.setResult(result);
};

function History(iban) {
    var d=new Date();
    d.setDate(d.getDate()-3);
    var response = AnyBalance.requestGet('https://api.monobank.ua/personal/statement/'+iban+'/'+d*1, g_headers);
    var json = getJson(response);
    var res = '';
    var prevd=new Date();
    prevd.setDate(prevd.getDate()-10);
    for (var i = 0; i < json.length; i++) {
        var t = json[i];
        var s=parseInt(t.amount);
        var d=new Date(t.time*1000);
        	if (res) res+='<br>';
            if (prevd.getDate()!=d.getDate()) {
            	res+='<big>'+getFormattedDate('DD.MM.YYYY',d)+':</big><br>';
            	prevd=d;}
            res += '<font  color=#'+(s<0?'B00000':'1e3b24')+'><strong>'+s/100;
            if (t.operationAmount!=t.amount) res+=' (' + t.operationAmount/100+')';
            res +=  '</strong></font> ' + getFormattedDate('HH:NN:SS',d) + '<BR><small>' + t.description + '<br>';
            if (t.commissionRate>0) res+=' Комиссия: '+t.commissionRate/100;
            if (t.cashbackAmount>0) res+=' Кешбэк: '+t.cashbackAmount/100;
            res+=' Баланс: '+t.balance/100;
            res +='</small>';
        }
    return res;
}
