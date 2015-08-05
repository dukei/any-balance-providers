# Введение #

Очень часто для получения каких либо данных нужны некоторые входные данные, например, логин и пароль пользователя, номер заказа или что-то ещё. Набор таких входных данных целиком и полностью зависит от конкретного провайдера, поэтому провайдерам предоставлена возможность добавлять свои настройки к общим настройками аккаунта AnyBalance.

# Файл настроек #

Настройки задаются в отдельном xml-файле, декларированном в категории `preferences` в [манифесте](Manifest.md). Такой файл может быть только один.

Структура файла очень близка к структуре xml-файла настроек [Android Preferences](http://developer.android.com/reference/android/preference/Preference.html), но проще (например, не нужно указывать область имен `android:` перед каждым атрибутом), потому что нам нужно не всё. О настройках в Android на русском языке можно почитать [здесь](http://habrahabr.ru/blogs/android_development/112100/).

AnyBalance поддерживает следующие настройки:
  * PreferenceScreen
  * PreferenceCategory
  * EditTextPreference
  * CheckBoxPreference
  * ListPreference

Итак, пример файла настроек для входа в Сервис-Гид Мегафона:
```
<?xml version="1.0" encoding="utf-8"?>
<PreferenceScreen>
    <EditTextPreference 
        key="login"
        title="Логин" 
        summary="Номер телефона (10 цифр)||{@s}\n" 
        dialogTitle="Номер телефона" 
        negativeButtonText="Отмена" 
        dialogMessage="Введите номер вашего телефона для входа в Сервис-Гид (10 цифр), например 9261234567"
        positiveButtonText="ОК" 
        inputType="number">
    </EditTextPreference>
    <EditTextPreference 
        key="password" 
        title="Пароль"
        summary="Пароль для входа в Сервис-Гид||***********\n"
        dialogTitle="Пароль"
        negativeButtonText="Отмена"
        dialogMessage="Введите пароль, используемый для входа в Сервис-Гид"
        positiveButtonText="ОК"
        inputType="textPassword">
    </EditTextPreference>
</PreferenceScreen>
```

Этот файл определяет два текстовых поля ввода для логина и пароля. Очень важен атрибут `key` - он определяет, под каким именем переменная с настройкой будет доступна в JavaScript (см. [AnyBalance.getPreferences](AnyBalanceAPI#getPreferences.md)). Остальные поля задают внешний вид настройки для пользователя.

Отличия от стандартного Android preferences xml:
  * Не нужно указывать область имен `android:` перед атрибутами
  * По сравнению с реализацией в Android сделано упрощение атрибута `summary`, оно автоматически меняется, чтобы показать реально выбранное пользователем значение. Для этого он делится на 3 части, третья из которых  может содержать специальную метку `{@s}`, которая заменяется на текущее значение настройки. Например:
```
summary="всегда показывается|показывается, если значение не выбрано|показывает, что {@s} выбрано"
```
  * Задание возможных значений для ListPreference `enties` и `entryValues` происходит прямо внутри атрибута:
```
<ListPreference entries="One|Two|Three" entryValues="1|2|3"/>
```

Корневой настройкой должен быть обязательно PreferenceScreen. В него могут быть вложены остальные настройки. В PreferenceCategory не может быть непосредственно вложена PreferenceCategory, но может быть вложен PreferenceScreen. Стандартно для Android.