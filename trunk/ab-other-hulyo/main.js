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

// duplicate flights check (same dates, same destination, same price)
function isUniqueFlight(val, idx, arr) 
{
	for (var i=0;i<idx;i++)
		if ((arr[i].DealDestinationName==val.DealDestinationName) && (arr[i].PriceTitle==val.PriceTitle) &&
			(arr[i].OutboundFlights[0].DepartureATA==val.OutboundFlights[0].DepartureATA) 		         &&
			(arr[i].InboundFlights[0].DepartureATA==val.InboundFlights[0].DepartureATA) 		         )
			return(false);
	return(true);
};
	
	
// Main
function main() 
{
	var prefs = AnyBalance.getPreferences();
	var flights1 = 'http://catalogs.hulyo.co.il/catalogs/Production/Flights/v1.2/under199Flights_B.js';
	var flights2 = 'http://catalogs.hulyo.co.il/catalogs/Production/Flights/v1.2/above199Flights_B.js';
	var pages = ['under199EuroFlights.js','above199EuroFlights.js'];
	var result = {success: true};
	AnyBalance.setDefaultCharset('utf-8');
	
	// access hulyo flights data
	var json = getJson(AnyBalance.requestGet(flights1,g_headers));
	var extra = getJson(AnyBalance.requestGet(flights2,g_headers));
	
	// combine the 2 catalogs into first one
	if ((!json.ErrorMessage) && (extra.ErrorMessage))
		json.ErrorMessage = extra.ErrorMessage;
	json.Flights = json.Flights.concat(extra.Flights);
	json.Flights = json.Flights.filter(isUniqueFlight); 
	
	// error checking, but only if there are really no flights at all
	if ((!json.Flights.length) && (json.ErrorMessage))
		throw new AnyBalance.Error(json.ErrorMessage,true);
	
	// prepare the info text from the reply json
	var info = "";
	for(var i=0;i<json.Flights.length;i++) 
	{
		var f = json.Flights[i];
		var there = new Date(parseDate(f.OutboundFlights[0].DepartureATA));
		var back = new Date(parseDate(f.InboundFlights[0].DepartureATA));
		var days = (back-there)/(1000*60*60*24);

		// don't show flights that exceed max days limit
		if (days>prefs.maxdays)
			continue;
			
		// dont show flights starting or returning at disallowed days of week
		if (!eval("prefs.day"+there.getDay()))
			continue;
		if (!eval("prefs.rday"+back.getDay()))
			continue;
			
		AnyBalance.trace(JSON.stringify(f));
		
		// add remaining flights
		info += info.length ? "\n" : "";
		info += f.PriceTitle + ", " + g_weekdays[there.getDay()] + there.toTimeString().substring(0,5) + 
				" עד " + g_weekdays[back.getDay()] + back.toTimeString().substring(0,5) + ", " + f.DealDestinationName;
	}

	// put some message if no flights were found
	info += info.length ? "" : "אין טיסות";
	
	// update the info and get the hell out
	getParam(info, result, "info", null, null, html_entity_decode)
	AnyBalance.setResult(result);
}
