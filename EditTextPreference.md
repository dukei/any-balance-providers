# Описание #
`EditTextPreference` представляет собой текстовое поле. При попытке изменить это поле выскакивает диалог, в котором это поле уже можно изменить. В диалоге можно указать некоторые дополнительные подсказки для пользователя по изменению текста. Оригинальное описание [здесь](http://developer.android.com/reference/android/preference/EditTextPreference.html).

# Атрибуты #
  * `inputType` - особенности ввода текста (string), возможные значения перечислены [здесь](http://developer.android.com/reference/android/widget/TextView.html#attr_android:inputType)

  * `dialogTitle` - заголовок диалога для редактирования настройки (строка),[оригинал](http://developer.android.com/reference/android/preference/DialogPreference.html#attr_android:dialogTitle)
  * `dialogMessage` - текст диалога для редактирования настройки (строка),[оригинал](http://developer.android.com/reference/android/preference/DialogPreference.html#attr_android:dialogMessage)
  * `positiveButtonText` - текст на кнопке подтверждения (строка),[оригинал](http://developer.android.com/reference/android/preference/DialogPreference.html#attr_android:positiveButtonText)
  * `negativeButtonText` - текст на кнопке отмены (строка),[оригинал](http://developer.android.com/reference/android/preference/DialogPreference.html#attr_android:negativeButtonText)

  * `key` - id настройки, которое можно использовать в других настройках или в JavaScript (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:key)
  * `title` - название настройки (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:title)
  * `summary` - Задаёт подсказку по настройке (строка). Чтобы она автоматически менялась, чтобы показать реально выбранное пользователем значение, она делится на 3 части, третья из которых  может содержать специальную метку `{@s}`, которая заменяется на текущее значение настройки. Например:
```
summary="всегда показывается|показывается, если значение не выбрано|показывает, что {@s} выбрано"
```
  * `defaultValue` - значение по умолчанию (строка). Будет отображаться в настройке как текущее значение. (text),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:defaultValue)
  * `enabled` - заблокирована ли настройка (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:enabled)
  * `shouldDisableView` - нужно ли блокировать вид настройки, если сама настройка заблокирована (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:shouldDisableView)
  * `selectable` - может ли быть выбрана пользователем (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:selectable)
  * `dependency` - зависимость от другой настройки. Здесь должен указываться `key` настройки, от которой зависит данная. Если в той настройке не выставлено значение, то эта настройка будет заблокирована (string),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:dependency)
  * `visible` - видна ли настройка (API v.7+). Внимание! Значения невидимых настроек при выходе из экрана настроек не сохраняются. Их надо показывать с помощью [API настроек](https://code.google.com/p/any-balance-providers/wiki/AnyBalanceAPI?ts=1375287953&updated=AnyBalanceAPI#Управление_настройками).
  * `obligatory` - обязательна ли эта настройка для заполнения (true или false)

# Пример #
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
        obligatory="true" 
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
        obligatory="true" 
        inputType="textPassword">
    </EditTextPreference>
</PreferenceScreen>
```