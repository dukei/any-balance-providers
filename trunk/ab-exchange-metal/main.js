/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы драг металлов с сайта ЦБР

Сайт: http://cbr.ru
Личный кабинет: http://www.cbr.ru/scripts/xml_metall.asp
*/


function numSize(num, size){
  var str = num + '';
  if(str.length < size){
    for(var i=str.length; i<size; ++i){
	str = '0' + str;
    }
  }
  return str;
}

function getDateString(dt){
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth()+1, 2) + '/' + dt.getFullYear();
}

function parseDate(str){
  var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
  var time = 0;
  if(matches){
	time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
  }
  return time;
}

function getMetal($xml, result, metal, idx){
	var maxtime = 0;
	if(AnyBalance.isAvailable(metal)){
		var price = 0;
		$xml.find('Record[Code="'+idx+'"]').each(function(index){
			var time = parseDate($(this).attr('Date'));
			if(time > maxtime){
				maxtime = time;
				price = parseFloat($(this).find('Buy').text().replace(/,/g,'.'));
			}
		});
		if(maxtime > 0){
			result[metal] = price;
		}
	}
	return maxtime;
}


function main(){
	AnyBalance.trace('Connecting to cbr...');
	var time = (new Date()).getTime();
	var yyesterday = new Date(time - 2*86400*1000);
	var tomorrow = new Date(time + 86400*1000);
	
	var info = AnyBalance.requestGet('http://www.cbr.ru/scripts/xml_metall.asp?date_req1=' + getDateString(yyesterday) + '&date_req2=' + getDateString(tomorrow));
	info = info.replace(/windows-1251/i, 'utf-8'); //Не парсится xml с этой левой кодировкой
	
	var result = {success: true};

	var xmlDoc = $.parseXML(info),
	  $xml = $(xmlDoc);

	var maxtime = Math.max(
		getMetal($xml, result, 'Au', '1'),
		getMetal($xml, result, 'Ag', '2'),
		getMetal($xml, result, 'Pt', '3'),
		getMetal($xml, result, 'Pd', '4'));

        var date;
	if(maxtime > 0){
		date = getDateString(new Date(maxtime));	
	}else{
		date = getDateString(new Date());	
	}
        result.__tariff = date;

	if(AnyBalance.isAvailable('date')){
                result.date = date;
	}

	AnyBalance.setResult(result);
}
