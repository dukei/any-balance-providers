/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Количество дней до отпуска, Нового Года, Дня Рождения и начала лета.
*/

function getDaysCount(year, month, day) {
  var now = new Date();
  var setdate = new Date(year, month-1, day);
  return Math.ceil((setdate - now) / 1000 / 60 / 60 / 24);
}

function main() {
    var prefs = AnyBalance.getPreferences();

    var result = {
        success: true
    };

	var now = new Date();

	result.summer=getDaysCount(((now.getMonth()>=8)?now.getFullYear()+1:now.getFullYear()), 6, 1);

	result.birthday=getDaysCount((((now.getMonth()+1)*100+now.getDate()>prefs.bmonth*100+parseInt(prefs.bday))?now.getFullYear()+1:now.getFullYear()), prefs.bmonth, prefs.bday);

	result.newyear=getDaysCount(now.getFullYear(), 12, 31)+1;

	if(prefs.aday>=1 && prefs.aday<=31 && prefs.ayear>=now.getFullYear()) {
		var aDays=getDaysCount(prefs.ayear,prefs.amonth,prefs.aday);
		if(aDays>0) {
			result.absence=aDays;
		}
	}

    AnyBalance.setResult(result);
}
