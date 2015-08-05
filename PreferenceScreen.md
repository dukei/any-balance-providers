# Описание #
`PreferenceScreen` представляет собой экран с настройками. Когда один PreferenceScreen вложен в другой, то открывается новый экран с настройками. Оригинальное описание [здесь](http://developer.android.com/reference/android/preference/PreferenceScreen.html).

# Атрибуты #
  * `key` - id настройки, которое можно использовать в других настройках или в JavaScript (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:key)
  * `title` - название настройки (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:title)
  * `summary` - подсказка по экрану настроек (строка), [оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:summary)
  * `enabled` - заблокирована ли настройка (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:enabled)
  * `shouldDisableView` - нужно ли блокировать вид настройки, если сама настройка заблокирована (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:shouldDisableView)
  * `selectable` - может ли быть выбрана пользователем (true/false),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:selectable)
  * `dependency` - зависимость от другой настройки. Здесь должен указываться `key` настройки, от которой зависит данная. Если в той настройке не выставлено значение, то эта настройка будет заблокирована (string),[оригинал](http://developer.android.com/reference/android/preference/Preference.html#attr_android:dependency)

# Пример #
```
<?xml version="1.0" encoding="utf-8"?>
<PreferenceScreen>
        <PreferenceCategory
                title="First Category">
                <CheckBoxPreference
                        title="Checkbox Preference"
                        defaultValue="false"
                        summaryOn="This preference is true"
                        summaryOff="This preference is false"
                        key="checkboxPref" />
                <ListPreference
                        title="List Preference"
                        summary="This preference allows to select an item in a array|Choose some|Chosen {@s}"
                        key="listPref"
                        defaultValue="2"
                        entries="One|Two|Three"
                        entryValues="1|2|3 />
        </PreferenceCategory>
        <PreferenceCategory
                title="Second Category">
                <PreferenceScreen
                        key="SecondPrefScreen"
                        title="Second PreferenceScreen"
                        summary="This is a second PreferenceScreen">
                        <EditTextPreference
                                name="Another EditText Preference"
                                summary="This is a preference in the second PreferenceScreen|Empty|{@s}"
                                title="Edit text"
                                key="SecondEditTextPref" />
                </PreferenceScreen>
        </PreferenceCategory>
</PreferenceScreen>
```