function getRateText(result, info, namein, nameout){
	var matches, regexp = new RegExp('"'+namein+'"[^"]*"([^"]*)"', 'i');
	if(matches = info.match(regexp)){
		if(AnyBalance.isAvailable(nameout))
			result[nameout] = matches[1];
	}
}

function getRate(result, info, namein, nameout){
	var matches, regexp = new RegExp('"'+namein+'"[^"]*"([^"]*)"', 'i');
	if(matches = info.match(regexp)){
		if(AnyBalance.isAvailable(nameout))
			result[nameout] = parseFloat(matches[1].replace(',','.'));
	}
}
	
function main(){
	AnyBalance.trace('Connecting to russianpost...');
	
	var dt = new Date();
	var info = AnyBalance.requestPost('http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo', {
		PATHCUR:'rp/servise/ru/home/postuslug/trackingpo',
		CDAY:dt.getDate(),
		CMONTH:dt.getMonth()+1,
		CYEAR:dt.getFullYear(),
		PATHWEB:'RP/INDEX/RU/Home',
		PATHPAGE:'RP/INDEX/RU/Home/Search',
		BarCode:g_preferences.code,
		searchsign:1
	});
	
	var result = {success: true},
		matches;
	
	if(matches = info.match(/<tr[^>]*><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr><\/tbody>/i)){
		var operation, date, location, attribute;
		if(AnyBalance.isAvailable('fulltext','operation'))
			operation = matches[1];
		if(AnyBalance.isAvailable('fulltext','date'))
			date = matches[2];
		if(AnyBalance.isAvailable('index'))
			result.index = matches[3];
		if(AnyBalance.isAvailable('fulltext','location'))
			location = matches[4];
		if(AnyBalance.isAvailable('fulltext','attribute'))
			attribute = matches[5];
		if(AnyBalance.isAvailable('weight'))
			weight = matches[6];
		
		if(AnyBalance.isAvailable('operation'))
			result.operation = operation;
		if(AnyBalance.isAvailable('date'))
			result.date = date;
		if(AnyBalance.isAvailable('date'))
			result.date = date;
		if(AnyBalance.isAvailable('location'))
			result.location = location;
		if(AnyBalance.isAvailable('attribute'))
			result.attribute = attribute;
		
		if(AnyBalance.isAvailable('fulltext'))
			result.fulltext = date + ': ' + operation + '\n' +
				location + '\n' + 
				attribute;
		
		AnyBalance.setResult(result);
	}else{
		throw new AnyBalance.Error("Отправление не найдено.")
	}
}
