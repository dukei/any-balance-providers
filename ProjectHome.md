<table cellpadding='8' align='right'>
<tr><td>
<wiki:gadget title="Последние обновления" url="https://any-balance-providers.googlecode.com/svn/misc/gadgets/downloads/gcDownloads.xml?1005" up_projectName="any-balance-providers" up_lastCount="20" width="300" border="0"/><br>
</td></tr>
</table>

<table cellpadding='10' align='left'>
<tr><td>
<img width='200' src='https://any-balance-providers.googlecode.com/svn/wiki/images/widgets.jpg' />
</td></tr>
</table>

Вам никогда не хотелось иметь нужную и актуальную информацию на экране мобильного телефона? Например, лично мне хотелось бы видеть баланс телефона, состояние счета интернет-провайдера, отслеживание почтового отправления, курсы валют, биржевые котировки. Такие программы есть, их много, но каждая показывает только часть того, что мне надо. Если мне понадобилось показать что-то еще, приходится держать на телефоне целый зоопарк программ. Или смириться, если такая программа еще не была написана. Или писать свою. Я решил написать свою, но сделать возможным добавление новых типов отображаемой информации для всех, чтобы вы сами, или ваш друг, знающий JavaScript, смогли добавить себе на экран мобильного телефона нужный индикатор.

AnyBalance - это приложение для Андроид (по крайней мере пока только для Андроид), которое позволяет любую информацию (например, баланс на счете телефона) показывать на экране в виджете. В отличие от других аналогичных программ, AnyBalance не сама запрашивает информацию для отображения. Эта информация поступает ей от специальных провайдеров, которые являются плагинами AnyBalance и написаны на JavaScript. Такой провайдер может написать любой человек, знакомый с JavaScript. Этот проект как раз призван собрать все провайдеры, которые можно использовать с AnyBalance.

## Где скачать AnyBalance ##

Приложение доступно в Андроид Маркете:
https://market.android.com/details?id=com.dukei.android.apps.anybalance
Прямо из приложения есть возможность установить любой [опубликованный провайдер](http://anybalance.ru/catalog.php?inapp=0) (установка из каталога).


## Документация ##
  * [Общая информация](Philosophy.md)
  * [AnyBalance API](AnyBalanceAPI.md)
  * [Отладка провайдеров](Debugging.md)
  * [Настройка HTML виджета](HtmlWidget.md)

## Примеры ##
  * [Hello World](TutorialHelloWorld.md)
  * [Курсы валют](TutorialExchangeCbr.md)
  * [Отслеживание посылок](TutorialTrackingRussianPost.md)
  * [Обработка XML](TutorialXML.md)

## Участие ##
  * [Добавление нового провайдера](HowToAddProvider.md)
  * [Изменение существующего провайдера](HowToChangeProvider.md)

## Интеграция ##
  * [Как получать и показывать балансы в своём приложении](ContentProvider.md)

## Вопросы ##

Если у вас возникли вопросы по работе с AnyBalance, пожалуйста, не стесняйтесь задавать их в группе обсуждения [AnyBalance providers group](http://groups.google.com/group/any-balance-providers-discuss)

AnyBalance application is an android (at least now) application that allows easily create an appwidget displaying small arbitrary counters. To get data for the counters it uses plugins - AnyBalance providers. AnyBalance provider is a small JavaScript-based program that requests data from a website and pass it to the host application.

Sorry, english documentation is not currently available. If you are interested in AnyBalance and have any questions, please do not hesitate to ask in [discussion group](http://groups.google.com/group/any-balance-providers-discuss).