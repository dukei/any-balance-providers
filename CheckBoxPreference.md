# Описание #
`CheckBoxPreference` представляет собой флажок да/нет. Оригинальное описание [здесь](http://developer.android.com/reference/android/preference/CheckBoxPreference.html).

# Атрибуты #
  * `summaryOn` - подсказка в случае, если флажок установлен (строка), [оригинал](http://developer.android.com/reference/android/preference/CheckBoxPreference.html#attr_android:summaryOn)
  * `summaryOff` - подсказка в случае, если флажок сброшен (строка), [оригинал](http://developer.android.com/reference/android/preference/CheckBoxPreference.html#attr_android:summaryOff)
  * `disableDependentsState` - в каком состоянии флажка блокировать зависимые настройки (true/false), [оригинал](http://developer.android.com/reference/android/preference/CheckBoxPreference.html#attr_android:disableDependentsState)

  * `key` - id настройки, которое можно использовать в других настройках или в JavaScript (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:key)
  * `title` - название настройки (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:title)
  * `defaultValue` - значение по умолчанию (строка). Будет отображаться в настройке как текущее значение (text),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:defaultValue)
  * `enabled` - заблокирована ли настройка (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:enabled)
  * `shouldDisableView` - нужно ли блокировать вид настройки, если сама настройка заблокирована (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:shouldDisableView)
  * `selectable` - может ли быть выбрана пользователем (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:selectable)
  * `dependency` - зависимость от другой настройки. Здесь должен указываться `key` настройки, от которой зависит данная. Если в той настройке не выставлено значение, то эта настройка будет заблокирована (string),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:dependency)
  * `obligatory` - обязательна ли эта настройка для заполнения (true или false)

# Пример #
```
<CheckBoxPreference
    title="Checkbox Preference"
    defaultValue="false"
    summaryOn="Something enabled"
    summaryOff="Something disabled"
    key="checkboxPref" />
```