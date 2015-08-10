/*
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Для получения информации без создания провайдера. Применять для специфических задач (например, онлайн вашей домашней странички), которые не нужны кому-то еще (для остальных случаев лучше создайте полноценный провайдер). Получает число с заданного URL по заданному же в настройках регулярному выражению. Для использования вы должны понимать синтаксис регулярных выражений в Javascript. Нужное число должно быть захвачено скобками. Первый URL должен быть указан обязательно, если не указывать следующие, то будет использовано содержимое полученное с первого URL. Максимально можно указать 4 счетчика.

Пример.
Чтобы узнать Индекс Цитирования Яндекса для вашего сайта введите следующие значения:
URL1: "http://yaca.yandex.ru/yca/cy/ch/yoursite.ru/"
Регулярное выражение №1: "<p class="b-cy_error-cy">[^\d]+(\d+)</p>"
*/

function main() {
    var prefs = AnyBalance.getPreferences();
	var data="";
	var r2 = new RegExp("[^0-9.-]");

    var result = {
        success: true
    };

	for(var i=1;i<=4;i++) {
		if(i==1 && prefs['url'+i]=='') throw new AnyBalance.Error('Для первого счетчика URL должен быть указан обязательно.');
		if(AnyBalance.isAvailable('counter'+i)) {
			if(prefs['url'+i] && prefs['url'+i].length>0) data = AnyBalance.requestGet(prefs['url'+i]);
			if(prefs['regexp'+i] && prefs['regexp'+i].length>0) {
				var flags=(prefs['flags'+i] && prefs['flags'+i].length>0)?prefs['flags'+i]:'';
				var r = new RegExp(prefs['regexp'+i],flags);
				var matches=r.exec(data);
				if(matches!=null) {
					matches[1]=matches[1].replace(",",".");
					matches[1]=matches[1].replace(r2,"");
					result['counter'+i]=parseFloat(matches[1]);
				}
			}
		}
	}

	AnyBalance.setResult(result);
}
