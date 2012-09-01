/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Количество дней до Нового Года, Дня Рождения и начала лета.
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

	result.birthday=getDaysCount((((now.getMonth()+1)*100+now.getDate()>prefs.month*100+prefs.day)?now.getFullYear()+1:now.getFullYear()), prefs.month, prefs.day);

	result.newyear=getDaysCount(now.getFullYear(), 12, 31)+1;

    AnyBalance.setResult(result);
}
