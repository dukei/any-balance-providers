# Описание #
`ListPreference` представляет выбор значения из списка. Оригинальное описание [здесь](http://developer.android.com/reference/android/preference/ListPreference.html).

# Атрибуты #
  * `entries` - варианты для выбора (string). Варианты должны быть разделены символом "|".
  * `entryValues` - значения вариантов для выбора (string). Именно это значение попадет в JavaScript как значение этой настройки. Значения  должны быть разделены символом "|" и их количество должно совпадать с количеством вариантов для выбора в предыдущем атрибуте. Например:
```
  entries="One|Two|Three" entryValues="1|2|3"
```

  * `key` - id настройки, которое можно использовать в других настройках или в JavaScript (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:key)
  * `title` - название настройки (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:title)
  * `summary` - Задаёт подсказку по настройке (строка). Чтобы она автоматически менялась, чтобы показать реально выбранное пользователем значение, она делится на 3 части, третья из которых  может содержать специальную метку `{@s}`, которая заменяется на текущее значение настройки. Например:
```
summary="всегда показывается|показывается, если значение не выбрано|показывает, что {@s} выбрано"
```
  * `defaultValue` - значение по умолчанию (строка). Будет отображаться в настройке как текущее значение (text),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:defaultValue)
  * `enabled` - заблокирована ли настройка (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:enabled)
  * `shouldDisableView` - нужно ли блокировать вид настройки, если сама настройка заблокирована (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:shouldDisableView)
  * `selectable` - может ли быть выбрана пользователем (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:selectable)
  * `dependency` - зависимость от другой настройки. Здесь должен указываться `key` настройки, от которой зависит данная. Если в той настройке не выставлено значение, то эта настройка будет заблокирована (string),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:dependency)
  * `obligatory` - обязательна ли эта настройка для заполнения (true или false)

# Пример #
```
<ListPreference
    title="List Preference"
    summary="This preference allows to select an item in a array|Choose anything|You have chosen {@s}!"
    key="listPref"
    defaultValue="2"
    entries="One|Two|Three"
    entryValues="1|2|3" />
```