// http request headers
var g_headers = 
{
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'en-US',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};


// days of week
var g_weekdays = ["א'","ב'","ג'","ד'","ה'","ו'","ש'"];


// get first bracket group from a regex match
function firstMatch(regex,str)
{
	var result = regex.exec(str);
	if (!result)
		throw new AnyBalance.Error("מידע לא צפוי מאתר דקה 90");
	return(result[1]);
}


// Main
function main() 
{
	var prefs = AnyBalance.getPreferences();
	var url = 'http://www.daka90.co.il/' + (prefs.flightsonly ? 'flights' :'48hours');
	var result = {success: true};
	AnyBalance.setDefaultCharset('utf-8');
	
	// access daka90 page, unlike Hulyo, there is no JSON API here
	var html = AnyBalance.requestGet(url, g_headers); 
	
	// iterate through the info blocks
	var info=""; var cnt = 0;
	var infoRegex = /SearchResultsWithImageBoxContainer"\s*>([\s\S]*?)<div\s*class="SearchResultWithImageBoxInnerBoxFooter"\s*>/ig;
	var infoBlock;
	while (infoBlock=infoRegex.exec(html))
	{
		infoBlock = infoBlock[1];
		
		// get the dates, skip entries without proper dates (some deals have unknown dates)
		var dateRegex = /(\d\d\/\d\d\/\d\d\d\d)[\s\S]*?(\d\d\:\d\d)/g;
		var there = dateRegex.exec(infoBlock); 
		if ((!there) || (!dateRegex.exec(infoBlock))) // the skipped one is the landing date
			continue;
		var back = dateRegex.exec(infoBlock); 
		if ((!back) || (!dateRegex.exec(infoBlock)))
			continue;
		
		// convet the dates, calculate the travel days 
		there = new Date(parseDate(there[1] + " " + there[2]));
		back = new Date(parseDate(back[1] + " " + back[2]));
		var days = (back-there)/(1000*60*60*24);
		
		// don't show flights that exceed max days limit
		if (days>prefs.maxdays)
			continue;

		// dont show flights starting or returning at disallowed days of week
		if (!eval("prefs.day"+there.getDay()))
			continue;
		if (!eval("prefs.rday"+back.getDay()))
			continue;

		// parse the rest of the data (city and price)
		var destination = replaceAll(firstMatch(/class="Department.*Campaign.*">([\s\S]*?)<\/div>\s*<\/div>/i,infoBlock),replaceTagsAndSpaces);
		var price = replaceAll(firstMatch(/<div class="FloatLeft">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i,infoBlock),replaceTagsAndSpaces).replace(/\s*/g,'');
		
		// add remaining flights
		info += info.length ? "\n" : "";
		info += price + ", " + g_weekdays[there.getDay()] + there.toTimeString().substring(0,5) + 
				" עד " + g_weekdays[back.getDay()] + back.toTimeString().substring(0,5) + ", " + destination;
	}

	// put some message if no flights were found
	info += info.length ? "" : "אין טיסות";
	
	// update the info and get the hell out
	getParam(info, result, "info", null, null, html_entity_decode)
	AnyBalance.setResult(result);
}
