# Введение #

Пошаговый отладчик провайдеров представляет собой [расширение Google Chrome](https://chrome.google.com/webstore/detail/bjhpeieonkhafpmpkjolifioeodfoiag), которое симулирует среду выполнения провайдера в AnyBalance. Симуляция, однако, не полная, поэтому если провайдер работает в отладчике, то его необходимо проверить и непосредственно в AnyBalance.

# Установка #

Для установки отладчика установите из магазина Google Chrome [расширение](https://chrome.google.com/webstore/detail/bjhpeieonkhafpmpkjolifioeodfoiag). После установки выполните следующий шаги.

  1. В Chrome перейдите по ссылке **chrome://settings/extensions**.
  1. Для расширения AnyBalanceDebugger установите галочки **Разрешить использование в режиме инкогнито** и **Разрешить открывать файлы по ссылкам**.

# Подготовка к отладке #

Для отладки необходимо сформировать специальный локальный html-файл, в котором должны быть прописаны ссылки на скрипты провайдера и определены необходимые для них настройки. Файл обязательно должен иметь имя, заканчивающееся на

**`-anybalance.html`**, например, `myprovider-anybalance.html`

в противном случае отладчик к нему не присоединится. Эту страницу можно сохранить на локальный диск со ссылки **chrome-extension://bjhpeieonkhafpmpkjolifioeodfoiag/debug-anybalance.html** или скопировать из листинга ниже. Комментарии показывают, в каких местах следует сделать изменения.

```
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <script src="chrome-extension://bjhpeieonkhafpmpkjolifioeodfoiag/json2.js"></script>
  <script src="chrome-extension://bjhpeieonkhafpmpkjolifioeodfoiag/jquery.min.js"></script>
  <script src="chrome-extension://bjhpeieonkhafpmpkjolifioeodfoiag/api-adapter.js"></script>
  <script src="chrome-extension://bjhpeieonkhafpmpkjolifioeodfoiag/api.js"></script>
  <script>
	var g_api_preferences = {
          //Вставьте сюда настройки, необходимые для вашего провайдера
          //Например:
          //  login: 'username',
          //  password: 'secretpass'
	};
  </script>
  <!-- Перечислите все скрипты, указанные в манифесте вашего провайдера.
       Указывайте локальные пути к файлам. Библиотека JQuery уже включена,
       отдельно указывать её не нужно.
       Например, -->
  <script src="library.js"></script>
  <script src="main.js"></script>
</head>
<body onload="">
  <div style="display:none" id="AnyBalanceDebuggerRPCContainer"></div>
  <button onclick="api_onload()">Execute</button>
  <div id="AnyBalanceDebuggerLog"></div>
</body>
</html>
```

Этот файл можно записать в любое место на локальном диске (но указанные в script тэгах файлы отлаживаемого провайдера должны быть доступны. Так что лучше размещать этот файл прямо в каталоге с отлаживаемым провайдером). После этого его надо открыть в Google Chrome. Если расширение установлено, то по  нажатию кнопки Execute должна быть выполнена функция `main()` провайдера. Отладочные сообщения направляются в консоль Chrome и на экран. Если вы поменяли исходные файлы провайдера, не забудьте обновить отладочную страницу в Chrome, иначе он не увидит ваши изменения!

# Пошаговая отладка #

Пошаговая отладка делается с помощью встроенного в Google Chrome отладчика JavaScript. Консоль JavaScript может быть вызвана комбинацией клавиш в Windows: CTRL-SHIFT-J, на Mac: ALT-⌘-J . Или в меню Инструменты-Консоль JavaScript. Можно устанавливать точки останова (кликнув на номер нужной строки в окне просмотра JavaScript файла).

# Особенности среды выполнения отладчика #

В отладчике не работает перекодировка ответа сервера с помощью [AnyBalance.setDefaultCharset](AnyBalanceAPI#setDefaultCharset.md). Но по идее сам браузер должен корректно перекодировать страницу, используя подсказки кодировки в тексте страницы. Но в AnyBalance, возможно, понадобится использование функции [AnyBalance.setDefaultCharset](AnyBalanceAPI#setDefaultCharset.md).

Куки и авторизация сохраняются между последовательными запросами к [AnyBalance.requestGet](AnyBalanceAPI#requestGet.md) и [AnyBalance.requestPost](AnyBalanceAPI#requestPost.md) так же, как и в AnyBalance. Но более того, куки сохраняются и между несколькими вызовами отладчика. Это может влиять на процедуру логина и навигации по сайту провайдера. Поэтому можете открыть новое окно Инкогнито и выполнить провайдер там - инкогнито открывается чистым, как будто вы ни разу не заходили до этого на сайт. Но будьте внимательны, все открытые окна Инкогнито Google Chrome разделяют куки между собой. Они очистятся только после закрытия **всех** окон Инкогнито и открытия одного заново.

Поскольку расширение Google Chrome это просто подписанный `Zip`, то исходный код этого расширения вы всегда можете увидеть, просто открыв [файл расширения](https://bintray.com/dukei/devtools/AnyBalanceDebugger/view) как `zip` файл. Если в процессе использования возникнут вопросы и предложения, то добро пожаловать в [группу](http://groups.google.com/group/any-balance-providers-discuss).