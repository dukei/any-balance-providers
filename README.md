<p align="right"><a href="http://anybalance.ru/catalog/?inapp=no" target="_blank"><b>Обновление провайдера вручную</b></a></p>
* * * 

<img align="left" hspace="10" width="200" src="https://any-balance-providers.googlecode.com/svn/wiki/images/widgets.jpg" />

Вам никогда не хотелось иметь нужную и актуальную информацию на экране мобильного телефона? Например, лично мне хотелось бы видеть баланс телефона, состояние счета интернет-провайдера, отслеживание почтового отправления, курсы валют, биржевые котировки. Такие программы есть, их много, но каждая показывает только часть того, что мне надо. Если мне понадобилось показать что-то еще, приходится держать на телефоне целый зоопарк программ. Или смириться, если такая программа еще не была написана. Или писать свою. Я решил написать свою, но сделать возможным добавление новых типов отображаемой информации для всех, чтобы вы сами, или ваш друг, знающий JavaScript, смогли добавить себе на экран мобильного телефона нужный индикатор.

AnyBalance - это приложение для Андроид (по крайней мере пока только для Андроид), которое позволяет любую информацию (например, баланс на счете телефона) показывать на экране в виджете. В отличие от других аналогичных программ, AnyBalance не сама запрашивает информацию для отображения. Эта информация поступает ей от специальных провайдеров, которые являются плагинами AnyBalance и написаны на JavaScript. Такой провайдер может написать любой человек, знакомый с JavaScript. Этот проект как раз призван собрать все провайдеры, которые можно использовать с AnyBalance.

## Где скачать AnyBalance ##

Приложение доступно в Гугл Плей:
  * [AnyBalance+](https://play.google.com/store/apps/details?id=com.krawlly.ab)
  * [AnyBalance](https://market.android.com/details?id=com.dukei.android.apps.anybalance)

Прямо из приложения есть возможность установить любой [опубликованный провайдер](http://anybalance.ru/catalog/?inapp=no) (установка из каталога).


## Документация ##
  * [Общая информация](https://github.com/dukei/any-balance-providers/wiki/Philosophy)
  * [AnyBalance API](https://github.com/dukei/any-balance-providers/wiki/AnyBalanceAPI)
  * [Отладка провайдеров](https://github.com/dukei/any-balance-providers/wiki/Debugging)
  * [Настройка HTML виджета](https://github.com/dukei/any-balance-providers/wiki/HtmlWidget)

## Примеры ##
  * [Hello World](https://github.com/dukei/any-balance-providers/wiki/TutorialHelloWorld)
  * [Курсы валют](https://github.com/dukei/any-balance-providers/wiki/TutorialExchangeCbr)
  * [Отслеживание посылок](https://github.com/dukei/any-balance-providers/wiki/TutorialTrackingRussianPost)
  * [Обработка XML](https://github.com/dukei/any-balance-providers/wiki/TutorialXML)

## Участие ##
  * [Добавление нового провайдера](https://github.com/dukei/any-balance-providers/wiki/HowToAddProvider)
  * [Изменение существующего провайдера](https://github.com/dukei/any-balance-providers/wiki/HowToChangeProvider)

## Интеграция ##
  * [Как получать и показывать балансы в своём приложении](https://github.com/dukei/any-balance-providers/wiki/ContentProvider)

## Вопросы ##

Если у вас возникли вопросы по работе с AnyBalance, пожалуйста, не стесняйтесь задавать их в группе обсуждения [AnyBalance providers group](http://groups.google.com/group/any-balance-providers-discuss)

AnyBalance application is an android (at least now) application that allows easily create an appwidget displaying small arbitrary counters. To get data for the counters it uses plugins - AnyBalance providers. AnyBalance provider is a small JavaScript-based program that requests data from a website and pass it to the host application.

Sorry, english documentation is not currently available. If you are interested in AnyBalance and have any questions, please do not hesitate to ask in [discussion group](http://groups.google.com/group/any-balance-providers-discuss).
