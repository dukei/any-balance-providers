/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сколько прошло с (осталось до) указанной даты. 
*/

var DateDiff = {

    inDays: function(d1, d2) {
        var t2 = d2.getTime();
        var t1 = d1.getTime();

        return parseInt((t2-t1)/(24*3600*1000));
    },

    inWeeks: function(d1, d2) {
        var t2 = d2.getTime();
        var t1 = d1.getTime();

        return parseInt((t2-t1)/(7*24*3600*1000));
    },

    inMonths: function(d1, d2) {
        var d1Y = d1.getFullYear();
        var d2Y = d2.getFullYear();
        var d1M = d1.getMonth();
        var d2M = d2.getMonth() - 1;
        var d1D = d1.getDate();
        var d2D = d2.getDate();
		
		var diff = d2D >= d1D ? 1 : 0;

        return (d2M+12*d2Y)-(d1M+12*d1Y) + diff;
    },

    inYears: function(d1, d2) {
        var d1Y = d1.getFullYear();
        var d2Y = d2.getFullYear() - 1;
        var d1M = d1.getMonth();
        var d2M = d2.getMonth();
        var d1D = d1.getDate();
        var d2D = d2.getDate();
		
		var diff = d2M > d1M ? 1 : d2M < d1M ? 0 : d2D >= d1D ? 1 : 0;
		
		var result = d2Y-d1Y + diff;
        return result < 0 ? 0 : result;
    }
}

function selectUnit(n, suf1, suf2, suf3) 
{
	if (n % 10 == 0 || n % 100 >= 11 && n % 100 <=14 || n % 10 >= 5)
	{
		return suf3;
	}
	else if (n % 10 == 1)
	{
		return suf1;
	}
	else if (n % 10 >= 2 && n % 10 <= 4)
	{
		return suf2;
	}
	return "";
}

function main()
{
    var prefs = AnyBalance.getPreferences();
    var result = {success: true};
	
	var confY = parseInt(prefs['year']);
	var confM = prefs['month'] - 1;
	var confD = parseInt(prefs['day']);
	
	var conf = new Date(confY, confM, confD);
	var now = new Date();
	now = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	
	var diff = now - conf;
	var min = diff > 0 ? conf : now;
	var max = diff < 0 ? conf : now;
	
	var y = min.getFullYear();
	var m = min.getMonth();
	var d = min.getDate();
	
	var year_full = DateDiff.inYears(min, max);
	var month_full = DateDiff.inMonths(min, max);
	var week_full = DateDiff.inWeeks(min, max);
	var day_full = DateDiff.inDays(min, max);
	var month = DateDiff.inMonths(new Date(y + year_full, m, d), max);
	var day = DateDiff.inDays(new Date(y + year_full + (m + month) / 12, (m + month) % 12, d), max);
	
	if (year_full >= 0)
	{
		result['year_full'] = year_full;
	}
	if (month_full >= 0)
	{
		result['month_full'] = month_full;
	}
	if (week_full >= 0)
	{
		result['week_full'] = week_full;
	}
	if (day_full >= 0)
	{
		result['day_full'] = day_full;
	}
	if (month >= 0)
	{
		result['month'] = month;
	}
	if (day >= 0)
	{
		result['day'] = day;
	}
	
	result['year_full_unit'] = selectUnit(year_full, "год", "года", "лет");
	result['day_full_unit'] = selectUnit(day_full, "день", "дня", "дней");
	result['day_unit'] = selectUnit(day, "день", "дня", "дней");

    AnyBalance.setResult(result);
}
