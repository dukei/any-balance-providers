/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы валют в белорусских банках с сайта http://select.by/kurs

Сайт: http://select.by
Личный кабинет: http://select.by/kurs/
*/

function main(){
	AnyBalance.trace('Connecting to select.by...');
	var prefs = AnyBalance.getPreferences();
    var city = prefs.city ? prefs.city + '/' : '';
	var info = AnyBalance.requestGet('https://select.by/'+ city+'kurs' );
	var bank = prefs.bank, table;
	if(bank == '!@other'){
	    checkEmpty(prefs.other, 'Введите часть названия другого банка');
		bank = prefs.other;
	}
	
	var result = {success: true};

        if(bank != 'nbrb'){
            table = getParam(info, null, null, /(<table[^>]*class="[^"]*tablesorter[^"]*"[^>]*>[\s\S]*?<\/table>)/i);
            if (!table) table=getElementsByClassName(info, 'table table-hover table-sm courses-main')[0];
			if(!table){
			    AnyBalance.trace(info);
				throw new AnyBalance.Error('Не удаётся найти таблицу курсов!');
			}
	        
	        var row;
			if(!bank)
			    bank = getParam(table,null,null,/<span class="icon icon-right-dir"><\/span>([^<]*)/i);

			var bankRe = replaceAll(bank, [/([(\\{}).*?])/g, '\\$1', /\s+/g, '(?:(?:<[^>]*>|\\s)(?!</td>))+']); //Превращаем название банка в регулярку, не учитываем тэги и пробелы
	        var regExp = new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?(' + bankRe + '[\\s\\S]*?</tr>)', 'i');
	        
	        row = getParam(table, null, null, regExp);
                
			if(!row){
			    AnyBalance.trace(info);
				throw new AnyBalance.Error('Не удаётся найти строку ' + bank);
			}

			//Находим полную ячейку, содержащую название банка

	        result.__tariff = getParam(row, null, null, /([^<]*)/, replaceTagsAndSpaces, html_entity_decode);
	        getParam(result.__tariff, result, 'bank');
	        
	        var replaceDotsToo = [replaceTagsAndSpaces, /(\D)[\.,]/g, '$1']; //Убираем лишние точки без цифр, чтобы не мешались
            getParam(row, result, 'usdpok', /(?:[\s\S]*?<t[dh][^>]*>){1}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
            getParam(row, result, 'usdprod', /(?:[\s\S]*?<t[dh][^>]*>){2}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
            getParam(row, result, 'eurpok', /(?:[\s\S]*?<t[dh][^>]*>){3}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
            getParam(row, result, 'eurprod', /(?:[\s\S]*?<t[dh][^>]*>){4}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
            getParam(row, result, 'rurpok', /(?:[\s\S]*?<t[dh][^>]*>){5}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
            getParam(row, result, 'rurprod', /(?:[\s\S]*?<t[dh][^>]*>){6}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
//            getParam(row, result, 'uepok', /(?:[\s\S]*?<t[dh][^>]*>){7}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
//            getParam(row, result, 'ueprod', /(?:[\s\S]*?<t[dh][^>]*>){8}([\s\S]*?)<\/t[dh]>/i, replaceDotsToo, parseBalance);
            getParam(row, result, 'tel', /(?:[\s\S]*?<t[dh][^>]*>){7}([\s\S]*?)<\/t[dh]>/i, replaceTagsAndSpaces, html_entity_decode);
        }else{
            var table = getParam(info, null, null, /Курсы Нацбанка РБ[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i);
			if(!table){
		        AnyBalance.trace(info);
				throw new AnyBalance.Error('Не удаётся найти таблицу НБ РБ!');
			}

			var date = getParam(table, null, null, /(?:[\s\S]*?<th[^>]*>){4}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, html_entity_decode);
			result.__tariff = 'НБ РБ на ' + date;

			if(AnyBalance.isAvailable('bank'))
				result.bank = result.__tariff;

            getParam(table, result, 'usdpok', /USD<(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceDotsToo, parseBalance);
            getParam(table, result, 'usdprod', /USD<(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceDotsToo, parseBalance);
            getParam(table, result, 'eurpok', /EUR<(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceDotsToo, parseBalance);
            getParam(table, result, 'eurprod', /EUR<(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceDotsToo, parseBalance);
            getParam(table, result, 'rurpok', /RUB<(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceDotsToo, parseBalance);
            getParam(table, result, 'rurprod', /RUB<(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceDotsToo, parseBalance);

            if(AnyBalance.isAvailable('tel'))
                result.tel = date; //В случае нац. банка вместо телефона кладем дату курса
        }

	AnyBalance.setResult(result);
}
