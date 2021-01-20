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
    var json = getJson(response);
    if (json.errorDescription) throw new AnyBalance.Error(json.errorDescription);
    result.fio=json.name;
    var json = json.accounts;
    var curdefault=0;
    var html='';
    var inf=''
    json.forEach(function(acc, index) {
    	var cardname=(acc.type=='fop'?'Карта ФЛП':(acc.type=='yellow'?'Детская':(acc.type=='black'?'Черная карта':(currentCardNum<4?'Карта'+currentCardNum:(acc.maskedPan[0]?acc.maskedPan[0]:acc.iban)))));
    	if (acc.currencyCode==980){ 
    	   result.balance+=acc.balance;
           result.limit+=acc.creditLimit;
        };
        switch (acc.type){
          case 'fop': case 'yellow': case 'black':
          	result[acc.type]=acc.balance/100;
                if (acc.creditLimit) {
                	result['suf'+acc.type]='+'+acc.creditLimit/100;
                        result[acc.type]-=result['suf'+acc.type];
                }
                result['suf'+acc.type]=(result['suf'+acc.type]?result['suf'+acc.type]:'')+' грн.';
                inf+='<br>'+cardname+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN:'+acc.iban;
          break;
          default :
          	inf+='<br>'(currentCardNum<2?'Карта'+(currentCardNum+1)+' ('+acc.type+')':acc.type)+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN:'+acc.iban;
          	if (currentCardNum>2) {
          		result.html+="Не отабражен баланс по карте "+acc.type+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN:'+acc.iban+'<br>';
          		break;
          	}
          	currentCardNum+=1;
                result['card'+currentCardNum]=acc.balance/100;
                  if (acc.creditLimit) {
                	result['sufcard'+currentCardNum]='+'+acc.creditLimit/100;
                        result['card'+currentCardNum]-=result['sufcard'+currentCardNum];
                  }
                result['sufcard'+currentCardNum]=(result['sufcard'+currentCardNum]?result['sufcard'+currentCardNum]:'')+acc.cashbackType.replace('UAH',' грн.');
          }
          if (AnyBalance.isAvailable('html')){
          	html+=History(acc.id,cardname);
          }
    });
    result.html+=jsonToHTML(html)+'<br><br>Проверены карты:<small>'+inf+'</small>';
    result.balance-=result.limit;
    result.balance/=100;
    result.limit/=100;
    result.__tariff='Обновлено '+getFormattedDate('DD.MM.YYYY HH:NN');
    AnyBalance.setResult(result);
};

function History(iban,cardname) {
    var d=new Date();
    d.setDate(d.getDate()-3);
    var response = AnyBalance.requestGet('https://api.monobank.ua/personal/statement/'+iban+'/'+d*1, g_headers);
    var json = getJson(response);
    if (json.errorDescription) {
    	AnyBalance.trace (cardname+': '+json.errorDescription);
    	return '{"cardname":"'+cardname+'","date":'+(new Date()/1000).toFixed(0)+',"res":"'+json.errorDescription+'"},';;
    }
    var res = '';
    var jres='';
    var prevd=new Date();
    //prevd.setDate(prevd.getDate()-10);
    //if (json.length>0) res+='<big>'+cardname+':</big><br>';
    for (var i = 0; i < json.length; i++) {
        var t = json[i];
        var s=parseInt(t.amount);
            res='<font  color=#'+(s<0?'B00000':'1e3b24')+'><strong>'+(s/100).toFixed(2);
            res+= t.operationAmount!=t.amount?' (' + (t.operationAmount/100).toFixed(2)+')':'';
            res+= '</strong></font> ' + getFormattedDate('HH:NN:SS',new Date(t.time*1000)) + '<BR><small>' + t.description + ' ';
            res+= t.commissionRate>0 ? ' Комиссия:'+(t.commissionRate/100).toFixed(2):'';
            res+= t.cashbackAmount>0 ? ' Кешбэк:'+(t.cashbackAmount/100).toFixed(2):'';
            res+=' Баланс:'+(t.balance/100).toFixed(2)+'</small>';
            jres+='{"cardname":"'+cardname+'","date":'+t.time+',"res":"'+res+'"},';
       }
    return jres;
}
function jsonToHTML(j){
    	var prevd=new Date();
    	prevd.setDate(prevd.getDate()-10);
	var prevcardname='';
	var res='';
	if (!j) return '';
	if (j.endsWith('},')) j=getJson('['+j.substr(0,j.length-1)+']');
	j.sort(function(a, b){return b.date-a.date});
	for (var i = 0; i < j.length; i++) {
		var d=new Date(j[i].date*1000);
		res+=res?'<br>':'';
            if (prevd.getDate()!=d.getDate()||prevcardname!=j[i].cardname) {
            	res+='<br><b><font color=#1A5276>'+j[i].cardname+' '+getFormattedDate('DD.MM.YYYY',d)+':</font><b><br>';
            	prevd=d;
            	prevcardname=j[i].cardname;
            	}
             res+=j[i].res;
	}
	return res;
}