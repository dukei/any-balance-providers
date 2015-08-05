# Введение #

AnyBalance позволяет другим приложениям на Android получить доступ к балансам и статистике по ним, используя [механизм поставщиков контента (Content Provider)](http://developer.android.com/guide/topics/providers/content-providers.html). Кроме того, есть возможность совершать некоторые действия, например, обновить заданный аккаунт.

# Пример #
Есть [исходный код](https://code.google.com/p/any-balance-providers/source/browse/trunk/extra/AnyBalanceDC) примера использования - [расширение](https://play.google.com/store/apps/details?id=com.dukei.android.extension.anybalance.dashclock) для [DashClock Widget](https://play.google.com/store/apps/details?id=net.nurik.roman.dashclock). Пример умеет получать балансы и иконки из AnyBalance, многие классы из примера могут пригодиться вам для работы с AnyBalance в вашем приложении. Прошу не стесняться и исследовать [исходный код](https://code.google.com/p/any-balance-providers/source/browse/trunk/extra/AnyBalanceDC).

Удобно также использовать следующую [программу](https://bintray.com/dukei/devtools/ContentProviderHelper) для того, чтобы визуально получить представление, какие данные и в каком виде возвращает Content Provider.

# Балансы #

Для получения данных из приложения необходимо воспользоваться экспортируемым контент провайдером. Его контракт приведен ниже.

Несмотря на то, что провайдер предоставляет много данных, большинству приложений необходимо будет работать лишь с url `content://com.dukei.android.provider.anybalance/accounts-ex`. По этой ссылке доступна таблица всех настроенных аккаунтов, их иконок и адаптированной для отображения информацией о текущих балансах и их изменениях. Рассмотрим эту таблицу подробнее.

  * `_ID` - числовой идентификатор аккаунта
  * `NAME` - название аккаунта, введенное пользователем
  * `PROVIDERID` - числовой идентификатор провайдера, на котором основан данный аккаунт
  * `LAST_CHECKED` - время последнего успешного получения балансов
  * `LAST_COUNTERS` - последние балансы в формате `JSON`
  * `LAST_CHECKED_ERROR` - время последней ошибки при обновлении аккаунта
  * `LAST_ERROR` - информация о последней ошибке обновления аккаунта в формате `JSON`
  * `ORDER` - порядковый номер аккаунта (как их упорядочил пользователь)
  * `ICON` - `BLOB`, содержащий иконку аккаунта

Необходимо иметь в виду, что если при последнем обновлении балансов возникла ошибка, то время `LAST_CHECKED_ERROR` будет больше, чем `LAST_CHECKED`. В противном случае время успешного обновления балансов `LAST_CHECKED` будет больше `LAST_CHECKED_ERROR`. Именно по сравнению этих времен можно понять, успешно ли было последнее обновление аккаунта.

# Формат балансов #

В поле `LAST_COUNTERS` передаются последние значения настроенных пользователем счетчиков и их изменения за различные периоды. Формат примерно такой:

```
{
    counters: [ //Массив балансов в порядке, настроенном пользователем
        {
            name : "Баланс", //Название баланса
            key : "balance",  //Идентификатор баланса
            type : "NUMERIC",  //Тип баланса
            valueDisplay : "546.15 р", //Форматированное отображение баланса
            valueOriginal : 546.15,    //Номинальное значение баланса
            valueNoUnits : "546.15",   //Форматированное отображение баланса без единиц изменения
            inactive: false, //Если true, то баланс при последнем обновлении не был получен.
                             //Такой баланс считается не совсем надежным
            diffs: {  //Изменения баланса за период
                year_diff: { //За год
                    neg : "-30", //Сумма уменьшений баланса за период
                    pos : "0",   //Сумма пополнений баланса за период
                    abs : "-30", //Абсолютное изменение баланса с начала периода
                },
                month_diff: {...}, //За месяц
                prev_month_diff: {...}, //За предыдущий месяц
                week_diff: {...}, //За неделю
                day_diff: {...}, //За день
                last_diff: {...}, //За последнее обновление
                last_diff_accumulated: {...}, //Последнее ненулевое изменение
            }
        },
        {
            name : "Бесплатные минуты",
            key : "mins_left",
            type : "TIME_INTERVAL",
            valueDisplay : "0 мин",
            valueNoUnits : "0",
            diffs: {...},
        },
        {
            name : "Бесплатные минуты (после порога)",
            key : "mins_n_free",
            type : "TIME_INTERVAL",
            valueDisplay : "0 мин",
            valueNoUnits : "0",
            diffs: {...},
        },
        {
            name : "Интернет (осталось)",
            key : "internet_left",
            type : "NUMERIC",
            valueDisplay : "0 Mb",
            valueNoUnits : "0",
            diffs: {...},
        },
        //...
    ],
    diff_names: { //Названия периодов
        year_diff : "Year",
        month_diff : "Month",
        prev_month_diff : "Prev.month",
        week_diff : "Week",
        day_diff : "Day",
        last_diff : "Last refresh",
    }
}
```

Типы балансов соответствуют [объявленным в манифесте](Manifest#Counters.md). Если тип HTML, то в значении счетчика может быть HTML разметка.

# Формат ошибки #

Если при обновлении счетчиков когда-то происходила ошибка, то поле `LAST_ERROR` будет содержать информацию о последней произошедшей ошибке.

**ВНИМАНИЕ!** Наличие ошибки в этом поле не говорит о том, что последнее обновление закончилось с ошибкой. Последнее обновление закончилось с ошибкой, только если `LAST_CHECKED_ERROR` > `LAST_CHECKED`!

```
{
    "fatal":false, //Если true, то автоматическое обновление баланса запрещено для этого аккаунта
    "message":"Пароль має містити від 6 до 20 символів.", //Сообщение пользователю
    "__time":1419187308441 //Время возникновения ошибки
}
```

По поводу `fatal`. Фатальная ошибка - это такая ошибка, после которой дальнейшие попытки обновить значения балансов точно не увенчаются успехом, но даже наоборот, могут привести к блокировке аккаунта. Поэтому лучше запретить автоматическое обновления аккаунта до вмешательства пользователя. Пример такой ошибки - неправильный пароль. Если пытаться долго входить в личный кабинет с неправильным логином и паролем, то это может привести к блокировке логина.

# Иконки #

В поле `ICON` передаётся иконка аккаунта. Но иконку можно получить и иным способом - по ссылке `content://com.dukei.android.provider.anybalance.icon/account-icon/#`, где вместо # необходимо подставить `_ID` соответствующего аккаунта. Эта ссылка полезна ещё тем, что доступ к `content://com.dukei.android.provider.anybalance` требует специального разрешения, а `content://com.dukei.android.provider.anybalance.icon` не требует и может использоваться на виджетах, например.

# Разрешение на использование контент провайдера #

Чтобы воспользоваться провайдером AnyBalance, приложение должно продекларировать в манифесте разрешение.

```
    <uses-permission android:name="com.dukei.android.provider.anybalance.READ_PERMISSION" />
```

Иконки можно получать без специального разрешения по ссылке `content://com.dukei.android.provider.anybalance.icon/account-icon/#`, где вместо # необходимо подставить `_ID` соответствующего аккаунта.

# Отслеживание изменений #

Следить за изменениями балансов можно с помощью стандартного механизма [ContentObserver](http://developer.android.com/reference/android/database/ContentObserver.html). Подписываться необходимо на изменение `content://com.dukei.android.provider.anybalance/accounts`. Именно `accounts`, а не `accounts-ex`!

# Действия #

Некоторые действия над аккаунтами можно выполнить с помощью интентов.
Для обновления аккаунта нужно использовать интент:
  * Action: `com.dukei.android.apps.anybalance.appwidget.action.MY_OWN_WIDGET_UPDATE`
  * Data: accountid://com.dukei.android.apps.anybalance/accounts/#
Вместо # нужно подставить `_ID` аккаунта

# Контракт #

Ниже приводится полный контракт для работы с контент провайдером AnyBalance. Там все названия полей и Authority.

```
public static final class MetaData {
    public static final int DATABASE_VERSION = 18;
    public static final String AUTHORITY = "com.dukei.android.provider.anybalance";
    public static final String DATABASE_NAME = "anybalance.db";
    public static final String PROVIDER_TABLE_NAME = "provider";
    public static final String ACCOUNT_TABLE_NAME = "account";
    public static final String COUNTER_TABLE_NAME = "counter";
    public static final String WIDGET_TABLE_NAME = "widget";
    public static final String ACCLOG_TABLE_NAME = "acclog";
    public static final String NOTIFICATION_TABLE_NAME = "notification";

    // inner class describing Provider Table
    public static final class Provider implements BaseColumns {
        public static final String TABLE_NAME = PROVIDER_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://"
                + AUTHORITY + "/providers");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.provider";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.provider";
        // Additional Columns start here.
        public static final String TEXTID = "textid";
        public static final String NAME = "name";
        public static final String FILES = "files";
        public static final String JSFILES = "jsfiles";
        public static final String VERSION = "version";
        public static final String DESCRIPTION = "description";
        public static final String AUTHOR = "author";
        public static final String ORDER = "norder"; // Порядок для чтения!
        public static final String VORDER = "vorder"; // Порядок для записи!

        public static final String DEFAULT_SORT_ORDER = ORDER + " ASC";
    }

    // inner class describing Account Table
    public static final class Account implements BaseColumns {
        public static final String TABLE_NAME = ACCOUNT_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://"
                + AUTHORITY + "/accounts");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.account";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.account";
        // Additional Columns start here.
        public static final String PROVIDERID = "providerid";
        public static final String NAME = "account_name";
        public static final String LAST_CHECKED = "last_checked";
        public static final String LAST_COUNTERS = "last_counters";
        public static final String LAST_CHECKED_ERROR = "last_checked_error";
        public static final String LAST_ERROR = "last_error";
        public static final String ORDER = "norder"; // Порядок для чтения!
        public static final String VORDER = "vorder"; // Порядок для записи!
        public static final String DATA = "data";

        public static final String DEFAULT_SORT_ORDER = ORDER + " ASC";
    }

    // inner class describing Account Table which is friendly for export
    public static final class AccountEx implements BaseColumns {
        public static final String TABLE_NAME = ACCOUNT_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY + "/accounts-ex");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.accountex";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.accountex";
        // Additional Columns start here.
        public static final String PROVIDERID = "providerid";
        public static final String NAME = "account_name";
        public static final String LAST_CHECKED = "last_checked";
        public static final String LAST_COUNTERS = "last_counters";
        public static final String LAST_CHECKED_ERROR = "last_checked_error";
        public static final String LAST_ERROR = "last_error";
        public static final String ICON = "icon";
        public static final String ORDER = "norder"; // Порядок для чтения!

        public static final String DEFAULT_SORT_ORDER = ORDER + " ASC";
    }

    // inner class describing Counter Table
    public static final class Counter implements BaseColumns {
        public static final String TABLE_NAME = COUNTER_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://"
                + AUTHORITY + "/counters");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.counter";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.counter";
        // Additional Columns start here.
        public static final String ACCOUNTID = "accountid";
        public static final String TIME = "request_time";
        public static final String COUNTERS = "counters";

        public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
    }

    // inner class describing Widget Table
    public static final class Widget implements BaseColumns {
        public static final String TABLE_NAME = WIDGET_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://"
                + AUTHORITY + "/widgets");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.widget";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.widget";
        // Additional Columns start here.
        public static final String ACCOUNTID = "accountid";

        public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
    }

    // inner class describing Acclog Table
    public static final class Acclog implements BaseColumns {
        public static final String TABLE_NAME = ACCLOG_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://"
                + AUTHORITY + "/acclogs");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.acclog";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.acclog";
        // Additional Columns start here.
        public static final String TIME = "event_time";
        public static final String ACCOUNTID = "accountid";
        public static final String CATEGORY = "cat";
        public static final String MESSAGE = "message";

        public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
    }

    // inner class describing Notification Table
    public static final class Notification implements BaseColumns {
        public static final String TABLE_NAME = NOTIFICATION_TABLE_NAME;
        // uri and MIME type definitions
        public static final Uri CONTENT_URI = Uri.parse("content://"
                + AUTHORITY + "/notifications");
        public static final String CONTENT_TYPE = "vnd.android.cursor.dir/vnd.anybalance.notification";
        public static final String CONTENT_ITEM_TYPE = "vnd.android.cursor.item/vnd.anybalance.notification";
        // Additional Columns start here.
        public static final String TIME = "event_time";
        public static final String ACCOUNTID = "accountid";
        public static final String MESSAGE = "message";

        public static final String DEFAULT_SORT_ORDER = _ID + " ASC";
    }

}
```