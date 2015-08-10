/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Количество прошедших дней от указанной даты.
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
	var daysNow=getDaysCount(now.getFullYear(), (now.getMonth()+1), now.getDate());
	
	for(var i=1;i<=7;i++) {
		if(String(prefs['year'+i]).length==4 && prefs['day'+i]!='') {
			result['counter'+i]=daysNow-getDaysCount(prefs['year'+i], prefs['month'+i], prefs['day'+i]);
		}
	}

    AnyBalance.setResult(result);
}
