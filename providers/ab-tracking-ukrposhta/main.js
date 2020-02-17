/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var g_headers ={
	'Content-Type':'application/json',
	'Authorization':'Bearer c3e02b53-3b1d-386e-b676-141ffa054c57',
	'User-Agent':'Dalvik/2.1.0 (Linux; U; Android 8.1.0; Redmi Note 3 Build/OPM6.171019.030.H1)',
	'Connection':'Keep-Alive',
	'Accept-Encoding':'gzip'
};
	AnyBalance.setDefaultCharset('utf-8'); 
	var json = getJson(AnyBalance.requestGet('http://www.ukrposhta.ua/status-tracking/0.0.1/statuses?barcode='+AnyBalance.getPreferences().login,g_headers));


	if(!json) throw new AnyBalance.Error('Не вдалося отримати інформацію. Сайт було змінено?');
	if(json.message) throw new AnyBalance.Error(json.message);
    var result = {success: true};
    var track = '';
    var l=json.length-1;
    for(var i = 0; i < l+1; i++)	{
    	var j=json[i];
        track += j.step+'.'+j.date.replace(/(\d+)-(\d+)-(\d+)T([\d:]*)/,'$3.$2.$1 $4')+' ';
        if (j.index) track+= j.index+' ';
        if (j.name)  track+= '('+j.name+') ';
        track+=j.country+' '+j.eventName;
        if (i!=l) track+='<br><br>';
	}
    var j=json[l];
    result.date=j.date.replace(/(\d+)-(\d+)-(\d+)T([\d:]*)/,'$3.$2.$1 $4');
    if (j.index) result.index=j.index;
    if (j.country) result.country=j.country;
    result.name=j.name;
    result.eventName=j.eventName;
    result.all=track;
    result.__tariff=j.barcode;
    AnyBalance.setResult(result);
}