# Введение #

В этом примере мы создадим простейший AnyBalance провайдер, который будет содержать единственный текстовый счетчик, возвращающий классический текст `Hello, World!`.

Этого примера нет в готовом виде в [репозитории](http://code.google.com/p/any-balance-providers/source/browse/#svn%2Ftrunk), он такой простой, что все файлы вы сможете создать самостоятельно.

# Создаём [манифест](Manifest.md) #

Создайте файл `anybalance-manifest.xml` и поместите внутрь следующий текст.

```
<?xml version="1.0" encoding="utf-8"?>
<provider>
  <id version="1">hello-world</id>
  <name>Hello world</name>
  <description>
    Hello, world!
  </description>
  <author>Dmitry Kochin &lt;dco@mail.ru&gt;</author>
  <files>
    <js>main.js</js>
  </files>
  <counters>
    <counter id="mycounter" name="Greeting" type="text"/>
  </counters>
</provider>
```

В манифесте, кроме названия и описания нашего провайдера определен файл, который выполняет работу по добыче значения нашего счетчика - `main.js`, а также название и тип счетчика, который мы предоставляем - `mycounter`.

# Создаём JavaScript #

Создадим теперь JavaScript, получающий наш счетчик. Создайте рядом с файлом манифеста файл `main.js`.

```
function main(){
  AnyBalance.setResult({success: true, mycounter: 'Hello, World!'});
}
```

Всё, теперь наш провайдер, когда AnyBalance вызовет функцию main() для обновления счетчика, вернет фразу Hello, World!

# Упаковываем в zip #

Упакуйте созданные только что `anybalance-manifest.xml` и `main.js` в `hello-world.zip`.

# Запускаем в AnyBalance #

Скопируйте `hello-world.zip` на ваше Android устройство в папку `/sdcard/AnyBalance` или `/sdcard/Download`. Это те папки, где AnyBalance пытается найти файлы провайдеров при выборе меню "Добавить из файла". Запустите AnyBalance и выберите Menu -> "Добавить аккаунт" ->  Menu -> "Добавить из файла...", установите галочку напротив Hello world (v.1) и нажмите Back. Провайдер установится. Вы можете создать на его основе аккаунт, в котором значение главного счетчика после обновления станет равным Hello, World!

# Другие примеры #

Конечно, от такого провайдера толку немного, он всегда показывает одно и то же. Но теперь вы знаете, как создать простейший AnyBalance провайдер. Вы можете посмотреть и другие примеры.

  * [Курсы валют](TutorialExchangeCbr.md)
  * [Отслеживание посылок](TutorialTrackingRussianPost.md)
  * [Обработка XML](TutorialXML.md)