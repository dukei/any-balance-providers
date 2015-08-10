/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Заработок за сегодня и вчера на Digital Stream.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Сайт партнерки: http://dstream.ru/
Личный кабинет: http://partner.dstream.ru/faces/login.jsf
*/

function main() {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet('http://partner.dstream.ru/j_acegi_security_check?j_username='+prefs.login+'&j_password='+prefs.password);

    var result = {
        success: true
    };

    var r = new RegExp('<a id="form:_id\\d+" href="/logout" class="iceOutLnk po-header-logout-link">');
	if(r.test(html)) {
		html = AnyBalance.requestGet('http://partner.dstream.ru/faces/partner/partner.jsf?page=statistic_section');

		r = new RegExp('Сводные данные</span>[\\s\\S]+?</span>([\\s\\S]+?)</tbody></table></div>');
		var matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Ошибка получения обобщенных данных');
		html=matches[1];
		
		r = new RegExp('<tr[^>]+><td[^>]+><span[^>]+>Итого:</span></td>([\\s\\S]+?)</tr>');
		var matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Ошибка получения итоговых данных');
		html=matches[1];

		r = new RegExp('<span id="([^"]+)" class="iceOutTxt">([^<]+)</span>','g');
		var updated=0;
		var mustbe=4;
		for(i=0;(matches=r.exec(html))!=null;i++) {
			matches[2]=matches[2].replace(",",".");
			matches[2]=matches[2].replace("&nbsp;"," ");
			matches[2]=matches[2].replace(" ","");
			switch(i) {
				case 0:
					result.today=parseFloat(matches[2]);
					updated++;
					break;
				case 1:
					result.yesterday=parseFloat(matches[2]);
					updated++;
					break;
				case 2:
					result.curmonth=parseFloat(matches[2]);
					updated++;
					break;
				case 3:
					result.prevmonth=parseFloat(matches[2]);
					updated++;
					break;
			}
		}
		if(updated!=mustbe) throw new AnyBalance.Error('Ошибка разбора статистики ('+updated+'/'+mustbe+')');
	} else {
		throw new AnyBalance.Error('Невозможно получить данные. Проверьте логин и пароль.');
	}

    AnyBalance.setResult(result);
}