/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {};
var types={black:'Черная',
	white:'Белая',
	platinum:'Платиновая',
	iron:'IRON',
	fop:'Счет ФЛП',
	yellow:'Детская'};

function main() {
    var prefs = AnyBalance.getPreferences();
    prefs.showLimit=prefs.showLimit||1;
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
    result.__tariff=capitalFirstLetters(json.name);
    var json = json.accounts;
    var curdefault=0;
    var html='';
    var inf='';
    var cardsBalances={};
    var currentCardNum=0;
    json.forEach(function(acc, index) {
    	var cardname=types[acc.type]?types[acc.type]:acc.type;
    	if (acc.currencyCode==980){ 
    	   result.balance+=acc.balance;
           result.limit+=acc.creditLimit;
        };
        cardsBalances[acc.id]={cardname:cardname,balance:acc.balance};
	if (types[acc.type]){
          	result[acc.type]=acc.balance/100;
                if (acc.creditLimit) {
                	if (prefs.showLimit==1) result['suf'+acc.type]='+'+acc.creditLimit/100;
                	if (prefs.showLimit!=2)	result[acc.type]-=+acc.creditLimit/100;
                }
                result['suf'+acc.type]=(result['suf'+acc.type]?result['suf'+acc.type]:'')+' грн.';
                inf+='<br>'+cardname+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN: '+acc.iban;
	}else{
          	AnyBalance.trace('Карта без счетчика:'+cardname);
          	inf+='<br>!!! Нет счетчика для карты '+cardname+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN: '+acc.iban+'<br>. Баланс карты: '+ acc.balance/100;
          		//break;
          };
    });
    if (AnyBalance.isAvailable('html')){
    	hist=AnyBalance.getData('historyPrevios')||[];
    	var cardsBalancesPrevios=AnyBalance.getData('cardsBalancesPrevios');
    	if (typeof (hist)=='string') {
    		hist=[];
    		cardsBalancesPrevios=[];
    	}
        for (var key in cardsBalances) {
        	if (!cardsBalancesPrevios||
        	    !cardsBalancesPrevios[key]||
        	    cardsBalances[key].balance!=cardsBalancesPrevios[key].balance||
        	    hist.some(e => e.cardname == cardsBalances[key].cardname && e.error)
        	    )
                      {
//        		try{
	var reason='';
	if (!cardsBalancesPrevios) {
		reason+='Балансы предыдущей проверки не известны.\n';
	}else{
		if (!cardsBalancesPrevios[key]) {
			reason+='Баланс предыдущей проверки по карте не известен.\n';
		}else{
			if (cardsBalances[key].balance!=cardsBalancesPrevios[key].balance) reason+='Баланс по карте изменился.\n';
		}
	}
	if (hist.some(e => e.cardname == cardsBalances[key].cardname && e.error)) reason+='Предыдущее чтение выписки по карте завершилось ошибкой.\n';
	AnyBalance.trace(reason+'Читаю выписку по '+cardsBalances[key].cardname);
       			      	History(key,cardsBalances[key].cardname,hist);
//        		}catch(e){
//       				AnyBalance.trace('Ошибка при чтении выписки: '+e.message);
//       			}
                      }
        	}
        AnyBalance.setData('historyPrevios',hist);
        AnyBalance.setData('cardsBalancesPrevios',cardsBalances);
	AnyBalance.saveData();
//	try{
    		html=jsonToHTML(hist)+'<br><br>'+'Проверены карты:<small>'+inf+'</small>';
//	}catch(e){
//    		AnyBalance.trace('Ошибка при форматировании выписки: '+e.message);
//	}
	result.html=html;
    };
    result.balance-=result.limit;
    result.balance/=100;
    result.limit/=100;
    AnyBalance.setResult(result);
};

function History(iban,cardname,hist) {
    var d=new Date();
    d.setDate(d.getDate()-3);
    var response = AnyBalance.requestGet('https://api.monobank.ua/personal/statement/'+iban+'/'+d*1, g_headers);
    var json = getJson(response);
    removeOldHist(hist,cardname);
    if (json.errorDescription) {
    	AnyBalance.trace (cardname+': '+json.errorDescription);
    		hist.push ({cardname:cardname,date:(new Date()/1000).toFixed(0),res:json.errorDescription,error:true});
    		return;
    }
    var res = '';
    var prevd=new Date();
    for (var i = 0; i < json.length; i++) {
        var t = json[i];
        var s=parseInt(t.amount);
            res='<font  color=#'+(s<0?'B00000':'1e3b24')+'><strong>'+(s/100).toFixed(2);
            res+= t.operationAmount!=t.amount?' (' + (t.operationAmount/100).toFixed(2)+')':'';
            res+= '</strong></font> ' + getFormattedDate('HH:NN:SS',new Date(t.time*1000)) + '<small><BR>' + t.description + '<BR>';
            res+= t.commissionRate>0 ? ' Комиссия:'+(t.commissionRate/100).toFixed(2):'';
            res+= t.cashbackAmount>0 ? ' Кешбэк:'+(t.cashbackAmount/100).toFixed(2):'';
            res+=' Баланс:'+(t.balance/100).toFixed(2)+'</small>';
            hist.push({cardname:cardname,date:t.time,res:res});
       }
}

function removeOldHist(hist,cardname){
	if (!hist) return [];
	for (var i = 0; i < hist.length; i++) 
		if (hist[i].cardname==cardname) hist.splice(i);
	return hist;
}

function jsonToHTML(j){
    	var prevd=new Date();
    	prevd.setDate(prevd.getDate()-10);
	var prevcardname='';
	var res='';
	if (!j) return '';
	j.sort(function(a, b){return b.date-a.date});
	for (var i = 0; i < j.length; i++) {
		var d=new Date(j[i].date*1000);
		res+=res?'<br>':'';
            if (prevd.getDate()!=d.getDate()||prevcardname!=j[i].cardname) {
            	res+=(res?'<br>':'')+'<b><font color=#1A5276>'+j[i].cardname+' '+getFormattedDate('DD.MM.YYYY',d)+':</font><b><br>';
            	prevd=d;
            	prevcardname=j[i].cardname;
            	}
             res+=j[i].res;
	}
	return res;
}