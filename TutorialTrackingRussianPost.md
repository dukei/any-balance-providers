# Введение #

В предыдущих примерах [Hello world](TutorialHelloWorld.md) и [Курсы валют](TutorialExchangeCbr.md) мы научились делать провайдеры, декларировать счетчики и извлекать их значения из веб страницы. Однако в большинстве случаев нужные вам данные не лежат в интернете без всякой защиты, доступные кому угодно. В таких случаях для входа на сайт вам нужен логин, пароль или другая информация, обеспечивающая безопасность данных.

В этом примере мы научимся задавать [настройки провайдера](Preferences.md) и получать их в JavaScript. Кроме того, используем функцию [AnyBalance.requestPost](AnyBalanceAPI#requestPost.md) для отсылки формы на сайт.

# Исследование #

Попробуем написать провайдер для получения информации о почтовом отправлении, которое доставляет нам российская почта. На сайте http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo размещена форма для ввода идентификатора почтового отправления. Номер, на котором можно тренироваться, можно найти поиском в интернете. Некоторые люди не стесняются и публикуют его. Возьмем к примеру, номер EA222769728RU.

Как обычно, будем с помощью Google Chrome отслеживать запросы, которые делает браузер, чтобы получить информацию о почтовом отправлении. Включаем журнал сети (Правой кнопкой в Хроме, Просмотр кода элемента, вкладка Network). Вводим в форму на сайте почты указанный выше номер отправления и нажимаем Enter.

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/post1.gif'><img width='640' src='http://any-balance-providers.googlecode.com/svn/wiki/images/post1.gif' /></a> Рис. 1

Обнаруживаем, что номер был отправлен POST запросом, параметры которого перечислены на рисунке. То есть, мы тоже можем послать такой запрос с такими параметрами, чтобы получить информацию по почтовому отправлению. Почта России показывает информацию по отправлению так:

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/post2.gif'><img width='640' src='http://any-balance-providers.googlecode.com/svn/wiki/images/post2.gif' /></a> Рис. 2

Для того, чтобы получить актуальный статус отправления, нам нужно смотреть на последнюю строчку. Смотрим на исходник... Одним регулярным выражением выделить последнюю строчку трудновато. Поэтому станем действовать гибко.

Идем на http://myregexp.com/signedJar.html, копируем туда весь html ответа с таблицей статусов отправления. Сначала нам надо найти в этом тексте таблицу.

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/post3.gif'><img width='640' src='http://any-balance-providers.googlecode.com/svn/wiki/images/post3.gif' /></a> Рис. 3

Чтобы найти последнюю строку в таблице, просто воспользуемся функцией [string.lastIndexOf('<tr')](http://javascript.ru/String/lastIndexOf). Найдя `<tr`, вырежем кусок, начиная с него и до конца таблицы.

Дальше нам надо найти поля уже внутри строки, это делается длинным, но простым регулярным выражением:

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/post4.gif'><img width='640' src='http://any-balance-providers.googlecode.com/svn/wiki/images/post4.gif' /></a> Рис. 4

Таким образом, сложности по придумыванию способа извлечь данные решены и можно это всё запрограммировать.

# Определение счетчиков #

На виджет надо вывести полную информацию о наиболее свежем статусе отправления. Наверное, стоит это сделать, сформировав сводку из всех столбцов последней строки таблицы. То есть, определим в [манифесте](Manifest.md) текстовый счетчик
```
  <counter id="fulltext" name="Сводка" type="html" />
```

Но это не просто текстовый счетчик, а текстовый счетчик, поддерживающий [некоторые тэги html](http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html). Поддержка тэгов куцая, картинки не поддерживаются, но хоть что-то.

# Определение настроек #

Для получения статуса отправления нам нужно знать его номер. Этот номер должен ввести пользователь при настройке аккаунта, основанном на нашем провайдере. [Настройки провайдера](Preferences.md) определяются в xml файле и декларируются в [манифесте](Manifest.md). Чтобы задать настройку для ввода номера почтового отправления, нам понадобится примерно такой xml:

```
﻿<?xml version="1.0" encoding="utf-8"?>
<PreferenceScreen>
    <EditTextPreference 
        title="Почтовый идентификатор" 
        positiveButtonText="ОК" 
        summary="Весь номер без скобок и пробелов!||{@s}\n" 
        dialogTitle="Почтовый идентификатор" 
        negativeButtonText="Отмена" 
        dialogMessage="Введите почтовый идентификатор. Почтовый идентификатор находится в чеке, выдаваемом при приеме почтового отправления. Вид номера: 115127(80)15138 4.
Следует вводить: 11512780151384 (весь номер, цифры и латинские буквы без скобок и пробелов)."
        key="code">
    </EditTextPreference>
</PreferenceScreen>
```

Здесь определяется одно поля для ввода текста и ей назначается переменная в JavaScript `code` (`key="code"`). Подробнее о настройках провайдера вы можете прочитать [здесь](Preferences.md).

Сохраним этот файл в preferences.xml и добавим декларацию в [манифест](Manifest.md):
```
<files>
  <!-- здесь уже декларированы всякие иконки и JavaScript, не будем их
       показывать для ясности. -->
  <preferences>preferences.xml</preferences>
</files>
```

Полный текст манифеста вы можете посмотреть в [репозитории](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-tracking-russian-post/anybalance-manifest.xml).

# Программирование #

Теперь функцию `main()` мы можем начать с того, что получим заполненные пользователем настройки с помощью [AnyBalance.getPreferences](AnyBalanceAPI#getPreferences.md).

```
var prefs = AnyBalance.getPreferences();
var post_number = prefs.code; //Код отправления, введенный пользователем
```

Имея код, можно сделать запрос на получение статуса отправления с помощью [AnyBalance.requestPost](AnyBalanceAPI#requestPost.md):
```
var dt = new Date();
var info = AnyBalance.requestPost('http://www.russianpost.ru/resp_engine.aspx?Path=rp/servise/ru/home/postuslug/trackingpo', {
       PATHCUR:'rp/servise/ru/home/postuslug/trackingpo',
       CDAY:dt.getDate(),
       CMONTH:dt.getMonth()+1,
       CYEAR:dt.getFullYear(),
       PATHWEB:'RP/INDEX/RU/Home',
       PATHPAGE:'RP/INDEX/RU/Home/Search',
       BarCode:post_number,
       searchsign:1
});
```

Я передал в запрос все поля с рис.1, которые имели не пустое значение, не особенно вдумываясь в их необходимость. Но так работает :) В том числе в параметрах передан и наш код отправления.

После этого осталось применить к полученному тексту разработанные нами выше регулярные выражения. В результате получим примерно такой код:
```
	var result = {success: true},
		matches;
	
	AnyBalance.trace('trying to find table');
	
	//Сначала найдём таблицу, содержащую все стадии отправления
	if(matches = info.match(/<table class="pagetext">.*?<tbody>(.*?)<\/tbody>/)){
		AnyBalance.trace('found table');
		var alltable = matches[1];
		//Потом найдем там последнюю строку
		var lasttr = alltable.lastIndexOf('<tr');
		AnyBalance.trace('found last row at ' + lasttr);
		
		info = alltable.substring(lasttr);
		AnyBalance.trace(info);
	
		//Потом найдем отдельные поля
		if(matches = info.match(/<tr[^>]*><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/i)){
			AnyBalance.trace('parsed fields');
			var operation, date, location, attribute;
			operation = matches[1];
			date = matches[2];
			location = matches[4];
			attribute = matches[5];
			if(AnyBalance.isAvailable('fulltext')){
                                //Все поддерживаемые тэги (кроме img) находятся здесь
                                //http://commonsware.com/blog/Android/2010/05/26/html-tags-supported-by-textview.html
                                result.fulltext = '<small>' + date + '</small>: <b>' + operation + '</b><br/>\n' +
                                        location + '<br/>\n' + 
                                        attribute;
			}
			AnyBalance.setResult(result);
		}
	}
	
	if(!AnyBalance.isSetResultCalled())
		throw new AnyBalance.Error("Отправление не найдено.")
```

Здесь использованы некоторые вспомогательные функции из [AnyBalance API](AnyBalanceAPI.md): [trace](AnyBalanceAPI#trace.md) и [isSetResultCalled](AnyBalanceAPI#isSetResultCalled.md). `trace` используется для вывода отладочных сообщений в лог аккаунта, который можно просмотреть в AnyBalance, как показано на рисунке.

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/log.png'><img width='240' src='http://any-balance-providers.googlecode.com/svn/wiki/images/log.png' /></a> Рис. 5

С помощью `trace` удобно отлаживать провайдер, когда не всё правильно работает с первого раза.

`isSetResultCalled()` возвращает `true`, если [AnyBalance.setResult()](AnyBalanceAPI#setResult.md) уже была вызвана. Соответственно, в нашем коде, если она не была вызвана, это сигнализирует о том, что мы не можем распарсить информацию об отправлении. В этом случае возвращаем ошибку [AnyBalance.Error()](AnyBalanceAPI#Error.md).

# Заключение #

Собрав все в один zip файл, получим провайдер Почты России. Полный исходный текст провайдера доступен в [репозитории](http://code.google.com/p/any-balance-providers/source/browse/trunk/ab-tracking-russian-post).

При показе провайдера в виджете следует выбрать большой виджет с одним большим текстовым полем, чтобы весь статус поместился целиком. Получится что-то вроде этого:

<a href='http://any-balance-providers.googlecode.com/svn/wiki/images/widgets.jpg'><img width='240' src='http://any-balance-providers.googlecode.com/svn/wiki/images/widgets.jpg' /></a> Рис. 6