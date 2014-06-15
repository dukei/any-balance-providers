function checkEmpty(param, error) {
    if (!param || param == '')
        throw new AnyBalance.Error(error);
}

function getData(url) {
	var data = AnyBalance.requestGet(url);
	if (data){
		var code = data.match(/<title>(.+?)<\/title>/i);
		if (code){
			throw new AnyBalance.Error(code[1]);
		} else {
			var js = $.parseJSON(data);
			var st =  js.status
			if (st == 'ok'){
				return js;
			} else if (st == 'error'){
				var err = js.error.message
				throw new AnyBalance.Error('Error: ' + err);
			} else {
				throw new AnyBalance.Error('Unknown server response: ' + st);
			}
		}
	} else {
		throw new AnyBalance.Error('Unknown error');
	}
}

function getID(nick, API_ADDR) {
	var v = getData(API_ADDR + '/2.0/account/list/?application_id=demo&search=' + nick);
	if (v.data[0]) {
		return v.data[0].id;
	} else {
		throw new AnyBalance.Error('ID not found! Check your settings.');
	}
}

function getDateTimeToString(d, strFormat){
// Author: Iljin Oleg
// http://iljin-oleg.blogspot.com/2012/09/javascript.html
var resultDateTime = strFormat;

var daysLong = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
var daysShort = ["Вс.","Пн.","Вт.","Ср.","Чт.","Пт.","Сб."];
var yearRegExp = d.getFullYear();
var monthRegExp = (String(d.getMonth()+1).length ==1) ? ("0"+(d.getMonth()+1)) : (d.getMonth()+1);
var dayRegExp = (d.getDate().toString().length ==1) ? ("0"+d.getDate()) : d.getDate();
var dayNameRegExp = d.getDay();
var hoursRegExp = (d.getHours().toString().length ==1) ? ("0"+d.getHours()) : d.getHours();
var minuteRegExp = (d.getMinutes().toString().length ==1) ? ("0"+d.getMinutes()) : d.getMinutes();
var secondsRegExp = (d.getSeconds().toString().length ==1) ? ("0"+d.getSeconds()) : d.getSeconds();
var milisecondsRegExp = (d.getMilliseconds().toString().length ==1) ? ("00"+d.getMilliseconds()) : ((d.getMilliseconds().toString().length ==2) ? ("0"+d.getMilliseconds()) : d.getMilliseconds());

resultDateTime = resultDateTime.replace(new RegExp('yyyy', 'g'), yearRegExp);
resultDateTime = resultDateTime.replace(new RegExp('yy', 'g'), String(yearRegExp).slice(-2));
resultDateTime = resultDateTime.replace(new RegExp('MM', 'g'), monthRegExp);
resultDateTime = resultDateTime.replace(new RegExp('dddd', 'g'), daysLong[dayNameRegExp]);
resultDateTime = resultDateTime.replace(new RegExp('ddd', 'g'), daysShort[dayNameRegExp]);
resultDateTime = resultDateTime.replace(new RegExp('dd', 'g'), dayRegExp);
resultDateTime = resultDateTime.replace(new RegExp('hh', 'g'), hoursRegExp);
resultDateTime = resultDateTime.replace(new RegExp('mm', 'g'), minuteRegExp);
resultDateTime = resultDateTime.replace(new RegExp('ss', 'g'), secondsRegExp);
resultDateTime = resultDateTime.replace(new RegExp('zz', 'g'), milisecondsRegExp);

return resultDateTime+"";
};