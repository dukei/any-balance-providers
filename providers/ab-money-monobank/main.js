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
    var inf='';
    var cardsBalances={};
    var currentCardNum=0;
    json.forEach(function(acc, index) {
    	
    	var cardname=(types[acc.type])?types[acc.type]:acc.type;
    	if (acc.currencyCode==980){ 
    	   result.balance+=acc.balance;
           result.limit+=acc.creditLimit;
        };
        cardsBalances[acc.id]={cardname:cardname,balance:acc.balance};
	if (types[acc.type]){
          	result[acc.type]=acc.balance/100;
                if (acc.creditLimit) {
                	result['suf'+acc.type]='+'+acc.creditLimit/100;
                        result[acc.type]-=result['suf'+acc.type];
                }
                result['suf'+acc.type]=(result['suf'+acc.type]?result['suf'+acc.type]:'')+' грн.';
                inf+='<br>'+cardname+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN:'+acc.iban;
	}else{
          	AnyBalance.trace('Карта без счетчика:'+acc.type);
          	inf+='<br>'+(currentCardNum<3?'Карта'+(currentCardNum+1)+' ('+acc.type+')':acc.type)+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN:'+acc.iban;
          	if (currentCardNum>2) {
          		result.html+="Не отображен баланс по карте "+acc.type+(acc.maskedPan[0]?' '+acc.maskedPan[0]:'')+' IBAN:'+acc.iban+'<br>';
          		//break;
          	}else{
          	  currentCardNum+=1;
                  result['card'+currentCardNum]=acc.balance/100;
                  result['sufcard'+currentCardNum]='';
                  result['prefcard'+currentCardNum]=acc.type+' ';
                  if (acc.creditLimit) {
                	result['sufcard'+currentCardNum]='+'+acc.creditLimit/100;
                        result['card'+currentCardNum]-=acc.creditLimit/100;
                  }
                  result['sufcard'+currentCardNum]=(result['sufcard'+currentCardNum]?result['sufcard'+currentCardNum]:'')+acc.cashbackType.replace('UAH',' грн.');
                }
          };
    });
    var hist='';
    if (AnyBalance.isAvailable('html')){
    	var needRead=false;
    	var cardsBalancesPrevios=AnyBalance.getData('cardsBalancesPrevios');
    		if(!cardsBalancesPrevios) needRead=true;
    		if(!needRead){
        	for (var key in cardsBalances) {
        		if (!cardsBalancesPrevios[key]) cardsBalancesPrevios[key].balance=-99999;
                        if (cardsBalances[key].balance!=cardsBalancesPrevios[key].balance) {needRead=true;break;}
        	}}
        	if (/"error":"true"/i.test(AnyBalance.getData('historyPrevios'))) needRead=true;
        	if(needRead){
        		try{
        			for (var key in cardsBalances)
        				hist+=History(key,cardsBalances[key].cardname);
                                AnyBalance.setData('historyPrevios',hist);
        		}catch(e){
        			AnyBalance.trace('Ошибка при чтении выписки: '+e.message);
                                hist=AnyBalance.getData('historyPrevios');
        		}
        	}else{
        		hist=AnyBalance.getData('historyPrevios');
        	}
    };
    AnyBalance.setData('cardsBalancesPrevios',cardsBalances);
    AnyBalance.saveData();
    html+=hist;
    result.balance-=result.limit;
    result.balance/=100;
    result.limit/=100;
    try{
    	html=(html?jsonToHTML(html)+'<br><br>':'')+'Проверены карты:<small>'+inf+'</small>';
    }catch(e){
    	AnyBalance.trace('Ошибка при форматировании выписки: '+e.message);
    }
    result.html=html;
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
    		return '{"cardname":"'+cardname+'","date":'+(new Date()/1000).toFixed(0)+',"res":"'+json.errorDescription+'","error":"true"},';;
    }
    var res = '';
    var jres='';
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
            jres+='{"cardname":"'+cardname+'","date":'+t.time+',"res":"'+res+'"},';
       }
    return jres.replace(/\n/g, '\\n');
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
            	res+=(res?'<br>':'')+'<b><font color=#1A5276>'+j[i].cardname+' '+getFormattedDate('DD.MM.YYYY',d)+':</font><b><br>';
            	prevd=d;
            	prevcardname=j[i].cardname;
            	}
             res+=j[i].res;
	}
	return res;
}