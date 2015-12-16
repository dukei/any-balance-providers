//Based on https://github.com/zwacky/isoCurrency

var CurrencyISO = (function () {
    var currencies = {
        'AFN': {
            text: 'Afghani',
            fraction: 2,
            symbol: '؋'
        },
        'EUR': {
            text: 'Euro',
            fraction: 2,
            symbol: '€'
        },
        'ALL': {
            text: 'Lek',
            fraction: 2,
            symbol: 'Lek'
        },
        'DZD': {
            text: 'Algerian Dinar',
            fraction: 2,
            symbol: 'د.ج'
        },
        'USD': {
            text: 'US Dollar',
            fraction: 2,
            symbol: '$'
        },
        'AOA': {
            text: 'Kwanza',
            fraction: 2,
            symbol: 'Kz'
        },
        'XCD': {
            text: 'East Caribbean Dollar',
            fraction: 2,
            symbol: '$'
        },
        'ARS': {
            text: 'Argentine Peso',
            fraction: 2,
            symbol: '$'
        },
        'AMD': {
            text: 'Armenian Dram',
            fraction: 2,
            symbol: false
        },
        'AWG': {
            text: 'Aruban Florin',
            fraction: 2,
            symbol: 'ƒ'
        },
        'AUD': {
            text: 'Australian Dollar',
            fraction: 2,
            symbol: '$'
        },
        'AZN': {
            text: 'Azerbaijanian Manat',
            fraction: 2,
            symbol: 'ман'
        },
        'BSD': {
            text: 'Bahamian Dollar',
            fraction: 2,
            symbol: '$'
        },
        'BHD': {
            text: 'Bahraini Dinar',
            fraction: 3,
            symbol: 'BD'
        },
        'BDT': {
            text: 'Taka',
            fraction: 2,
            symbol: '৳'
        },
        'BBD': {
            text: 'Barbados Dollar',
            fraction: 2,
            symbol: '$'
        },
        'BYR': {
            text: 'Belarussian Ruble',
            fraction: 0,
            symbol: 'p.'
        },
        'BZD': {
            text: 'Belize Dollar',
            fraction: 2,
            symbol: 'BZ$'
        },
        'XOF': {
            text: 'CF Franc BCEAO',
            fraction: 0,
            symbol: 'CFA'
        },
        'BMD': {
            text: 'Bermudian Dollar',
            fraction: 2,
            symbol: '$'
        },
        'BTN': {
            text: 'Ngultrum',
            fraction: 2,
            symbol: 'Nu'
        },
        'INR': {
            text: 'Indian Rupee',
            fraction: 2,
            symbol: '₹'
        },
        'BOB': {
            text: 'Boliviano',
            fraction: 2,
            symbol: '$b'
        },
        'BOV': {
            text: 'Mvdol',
            fraction: 2,
            symbol: '$b'
        },
        'BAM': {
            text: 'Convertible Mark',
            fraction: 2,
            symbol: 'KM'
        },
        'BWP': {
            text: 'Pula',
            fraction: 2,
            symbol: 'P'
        },
        'NOK': {
            text: 'Norwegian Krone',
            fraction: 2,
            symbol: 'kr'
        },
        'BRL': {
            text: 'Brazilian Real',
            fraction: 2,
            symbol: 'R$'
        },
        'BND': {
            text: 'Brunei Dollar',
            fraction: 2,
            symbol: '$'
        },
        'BGN': {
            text: 'Bulgarian Lev',
            fraction: 2,
            symbol: 'лв'
        },
        'BIF': {
            text: 'Burundi Franc',
            fraction: 0,
            symbol: 'BIF'
        },
        'KHR': {
            text: 'Riel',
            fraction: 2,
            symbol: '៛'
        },
        'XAF': {
            text: 'CF Franc BEAC',
            fraction: 0,
            symbol: false
        },
        'CAD': {
            text: 'Canadian Dollar',
            fraction: 2,
            symbol: '$'
        },
        'CVE': {
            text: 'Cabo Verde Escudo',
            fraction: 2,
            symbol: '$'
        },
        'KYD': {
            text: 'Cayman Islands Dollar',
            fraction: 2,
            symbol: '$'
        },
        'CLF': {
            text: 'Unidad de Fomento',
            fraction: 4,
            symbol: false
        },
        'CLP': {
            text: 'Chilean Peso',
            fraction: 0,
            symbol: '$'
        },
        'CNY': {
            text: 'Yuan Renminbi',
            fraction: 2,
            symbol: '¥'
        },
        'COP': {
            text: 'Colombian Peso',
            fraction: 2,
            symbol: '$'
        },
        'COU': {
            text: 'Unidad de Valor Real',
            fraction: 2,
            symbol: false
        },
        'KMF': {
            text: 'Comoro Franc',
            fraction: 0,
            symbol: false
        },
        'CDF': {
            text: 'Congolese Franc',
            fraction: 2,
            symbol: false
        },
        'NZD': {
            text: 'New Zealand Dollar',
            fraction: 2,
            symbol: '$'
        },
        'CRC': {
            text: 'Cost Rican Colon',
            fraction: 2,
            symbol: '₡'
        },
        'HRK': {
            text: 'Croatian Kuna',
            fraction: 2,
            symbol: 'kn'
        },
        'CUC': {
            text: 'Peso Convertible',
            fraction: 2,
            symbol: false
        },
        'CUP': {
            text: 'Cuban Peso',
            fraction: 2,
            symbol: '₱'
        },
        'ANG': {
            text: 'Netherlands Antillean Guilder',
            fraction: 2,
            symbol: 'ƒ'
        },
        'CZK': {
            text: 'Czech Koruna',
            fraction: 2,
            symbol: 'Kč'
        },
        'DKK': {
            text: 'Danish Krone',
            fraction: 2,
            symbol: 'kr'
        },
        'DJF': {
            text: 'Djibouti Franc',
            fraction: 0,
            symbol: false
        },
        'DOP': {
            text: 'Dominican Peso',
            fraction: 2,
            symbol: 'RD$'
        },
        'EGP': {
            text: 'Egyptian Pound',
            fraction: 2,
            symbol: '£'
        },
        'SVC': {
            text: 'El Salvador Colon',
            fraction: 2,
            symbol: '$'
        },
        'ERN': {
            text: 'Nakfa',
            fraction: 2,
            symbol: false
        },
        'ETB': {
            text: 'Ethiopian Birr',
            fraction: 2,
            symbol: false
        },
        'FKP': {
            text: 'Falkland Islands Pound',
            fraction: 2,
            symbol: '£'
        },
        'FJD': {
            text: 'Fiji Dollar',
            fraction: 2,
            symbol: '$'
        },
        'XPF': {
            text: 'CFP Franc',
            fraction: 0,
            symbol: false
        },
        'GMD': {
            text: 'Dalasi',
            fraction: 2,
            symbol: false
        },
        'GEL': {
            text: 'Lari',
            fraction: 2,
            symbol: false
        },
        'GHS': {
            text: 'Ghan Cedi',
            fraction: 2,
            symbol: false
        },
        'GIP': {
            text: 'Gibraltar Pound',
            fraction: 2,
            symbol: '£'
        },
        'GTQ': {
            text: 'Quetzal',
            fraction: 2,
            symbol: 'Q'
        },
        'GBP': {
            text: 'Pound Sterling',
            fraction: 2,
            symbol: '£'
        },
        'GNF': {
            text: 'Guine Franc',
            fraction: 0,
            symbol: false
        },
        'GYD': {
            text: 'Guyan Dollar',
            fraction: 2,
            symbol: '$'
        },
        'HTG': {
            text: 'Gourde',
            fraction: 2,
            symbol: false
        },
        'HNL': {
            text: 'Lempira',
            fraction: 2,
            symbol: 'L'
        },
        'HKD': {
            text: 'Hong Kong Dollar',
            fraction: 2,
            symbol: '$'
        },
        'HUF': {
            text: 'Forint',
            fraction: 2,
            symbol: 'Ft'
        },
        'ISK': {
            text: 'Iceland Krona',
            fraction: 0,
            symbol: 'kr'
        },
        'IDR': {
            text: 'Rupiah',
            fraction: 2,
            symbol: 'Rp'
        },
        'XDR': {
            text: 'SDR (Special Drawing Right)',
            fraction: 0,
            symbol: false
        },
        'IRR': {
            text: 'Iranian Rial',
            fraction: 2,
            symbol: '﷼'
        },
        'IQD': {
            text: 'Iraqi Dinar',
            fraction: 3,
            symbol: false
        },
        'ILS': {
            text: 'New Israeli Sheqel',
            fraction: 2,
            symbol: '₪'
        },
        'JMD': {
            text: 'Jamaican Dollar',
            fraction: 2,
            symbol: 'J$'
        },
        'JPY': {
            text: 'Yen',
            fraction: 0,
            symbol: '¥'
        },
        'JOD': {
            text: 'Jordanian Dinar',
            fraction: 3,
            symbol: false
        },
        'KZT': {
            text: 'Tenge',
            fraction: 2,
            symbol: 'лв'
        },
        'KES': {
            text: 'Kenyan Shilling',
            fraction: 2,
            symbol: false
        },
        'KPW': {
            text: 'North Korean Won',
            fraction: 2,
            symbol: '₩'
        },
        'KRW': {
            text: 'Won',
            fraction: 0,
            symbol: '₩'
        },
        'KWD': {
            text: 'Kuwaiti Dinar',
            fraction: 3,
            symbol: false
        },
        'KGS': {
            text: 'Som',
            fraction: 2,
            symbol: 'лв'
        },
        'LAK': {
            text: 'Kip',
            fraction: 2,
            symbol: '₭'
        },
        'LBP': {
            text: 'Lebanese Pound',
            fraction: 2,
            symbol: '£'
        },
        'LSL': {
            text: 'Loti',
            fraction: 2,
            symbol: false
        },
        'ZAR': {
            text: 'Rand',
            fraction: 2,
            symbol: 'R'
        },
        'LRD': {
            text: 'Liberian Dollar',
            fraction: 2,
            symbol: '$'
        },
        'LYD': {
            text: 'Libyan Dinar',
            fraction: 3,
            symbol: false
        },
        'CHF': {
            text: 'Swiss Franc',
            fraction: 2,
            symbol: 'CHF'
        },
        'LTL': {
            text: 'Lithuanian Litas',
            fraction: 2,
            symbol: 'Lt'
        },
        'MOP': {
            text: 'Pataca',
            fraction: 2,
            symbol: false
        },
        'MKD': {
            text: 'Denar',
            fraction: 2,
            symbol: 'ден'
        },
        'MGA': {
            text: 'Malagasy riary',
            fraction: 2,
            symbol: false
        },
        'MWK': {
            text: 'Kwacha',
            fraction: 2,
            symbol: false
        },
        'MYR': {
            text: 'Malaysian Ringgit',
            fraction: 2,
            symbol: 'RM'
        },
        'MVR': {
            text: 'Rufiyaa',
            fraction: 2,
            symbol: false
        },
        'MRO': {
            text: 'Ouguiya',
            fraction: 2,
            symbol: false
        },
        'MUR': {
            text: 'Mauritius Rupee',
            fraction: 2,
            symbol: '₨'
        },
        'XUA': {
            text: 'ADB Unit of ccount',
            fraction: 0,
            symbol: false
        },
        'MXN': {
            text: 'Mexican Peso',
            fraction: 2,
            symbol: '$'
        },
        'MXV': {
            text: 'Mexican Unidad de Inversion (UDI)',
            fraction: 2,
            symbol: false
        },
        'MDL': {
            text: 'Moldovan Leu',
            fraction: 2,
            symbol: false
        },
        'MNT': {
            text: 'Tugrik',
            fraction: 2,
            symbol: '₮'
        },
        'MAD': {
            text: 'Moroccan Dirham',
            fraction: 2,
            symbol: false
        },
        'MZN': {
            text: 'Mozambique Metical',
            fraction: 2,
            symbol: 'MT'
        },
        'MMK': {
            text: 'Kyat',
            fraction: 2,
            symbol: false
        },
        'NAD': {
            text: 'Namibi Dollar',
            fraction: 2,
            symbol: '$'
        },
        'NPR': {
            text: 'Nepalese Rupee',
            fraction: 2,
            symbol: '₨'
        },
        'NIO': {
            text: 'Cordob Oro',
            fraction: 2,
            symbol: 'C$'
        },
        'NGN': {
            text: 'Naira',
            fraction: 2,
            symbol: '₦'
        },
        'OMR': {
            text: 'Rial Omani',
            fraction: 3,
            symbol: '﷼'
        },
        'PKR': {
            text: 'Pakistan Rupee',
            fraction: 2,
            symbol: '₨'
        },
        'PAB': {
            text: 'Balboa',
            fraction: 2,
            symbol: 'B/.'
        },
        'PGK': {
            text: 'Kina',
            fraction: 2,
            symbol: 'K'
        },
        'PYG': {
            text: 'Guarani',
            fraction: 0,
            symbol: 'Gs'
        },
        'PEN': {
            text: 'Nuevo Sol',
            fraction: 2,
            symbol: 'S/.'
        },
        'PHP': {
            text: 'Philippine Peso',
            fraction: 2,
            symbol: '₱'
        },
        'PLN': {
            text: 'Zloty',
            fraction: 2,
            symbol: 'zł'
        },
        'QAR': {
            text: 'Qatari Rial',
            fraction: 2,
            symbol: '﷼'
        },
        'RON': {
            text: 'New Romanian Leu',
            fraction: 2,
            symbol: 'lei'
        },
        'RUB': {
            text: 'Russian Ruble',
            fraction: 2,
            symbol: 'р'
        },
        'RUR': {
            text: 'Russian Ruble',
            fraction: 2,
            symbol: 'р'
        },
        'RWF': {
            text: 'Rwand Franc',
            fraction: 0,
            symbol: 'R₣'
        },
        'SHP': {
            text: 'Saint Helen Pound',
            fraction: 2,
            symbol: '£'
        },
        'WST': {
            text: 'Tala',
            fraction: 2,
            symbol: '$'
        },
        'STD': {
            text: 'Dobra',
            fraction: 2,
            symbol: false
        },
        'SAR': {
            text: 'Saudi Riyal',
            fraction: 2,
            symbol: '﷼'
        },
        'RSD': {
            text: 'Serbian Dinar',
            fraction: 2,
            symbol: 'Дин.'
        },
        'SCR': {
            text: 'Seychelles Rupee',
            fraction: 2,
            symbol: '₨'
        },
        'SLL': {
            text: 'Leone',
            fraction: 2,
            symbol: 'Le'
        },
        'SGD': {
            text: 'Singapore Dollar',
            fraction: 2,
            symbol: '$'
        },
        'XSU': {
            text: 'Sucre',
            fraction: 0,
            symbol: false
        },
        'SBD': {
            text: 'Solomon Islands Dollar',
            fraction: 2,
            symbol: '$'
        },
        'SOS': {
            text: 'Somali Shilling',
            fraction: 2,
            symbol: 'S'
        },
        'SSP': {
            text: 'South Sudanese Pound',
            fraction: 2,
            symbol: false
        },
        'LKR': {
            text: 'Sri Lank Rupee',
            fraction: 2,
            symbol: '₨'
        },
        'SDG': {
            text: 'Sudanese Pound',
            fraction: 2,
            symbol: false
        },
        'SRD': {
            text: 'Surinam Dollar',
            fraction: 2,
            symbol: '$'
        },
        'SZL': {
            text: 'Lilangeni',
            fraction: 2,
            symbol: false
        },
        'SEK': {
            text: 'Swedish Krona',
            fraction: 2,
            symbol: 'kr'
        },
        'CHE': {
            text: 'WIR Euro',
            fraction: 2,
            symbol: false
        },
        'CHW': {
            text: 'WIR Franc',
            fraction: 2,
            symbol: false
        },
        'SYP': {
            text: 'Syrian Pound',
            fraction: 2,
            symbol: '£'
        },
        'TWD': {
            text: 'New Taiwan Dollar',
            fraction: 2,
            symbol: 'NT$'
        },
        'TJS': {
            text: 'Somoni',
            fraction: 2,
            symbol: false
        },
        'TZS': {
            text: 'Tanzanian Shilling',
            fraction: 2,
            symbol: false
        },
        'THB': {
            text: 'Baht',
            fraction: 2,
            symbol: '฿'
        },
        'TOP': {
            text: 'Pa’anga',
            fraction: 2,
            symbol: false
        },
        'TTD': {
            text: 'Trinidad nd Tobago Dollar',
            fraction: 2,
            symbol: 'TT$'
        },
        'TND': {
            text: 'Tunisian Dinar',
            fraction: 3,
            symbol: false
        },
        'TRY': {
            text: 'Turkish Lira',
            fraction: 2,
            symbol: '₺'
        },
        'TMT': {
            text: 'Turkmenistan New Manat',
            fraction: 2,
            symbol: false
        },
        'UGX': {
            text: 'Ugand Shilling',
            fraction: 0,
            symbol: false
        },
        'UAH': {
            text: 'Hryvnia',
            fraction: 2,
            symbol: '₴'
        },
        'AED': {
            text: 'UAE Dirham',
            fraction: 2,
            symbol: false
        },
        'USN': {
            text: 'US Dollar (Next day)',
            fraction: 2,
            symbol: false
        },
        'UYI': {
            text: 'Uruguay Peso en Unidades Indexadas (URUIURUI)',
            fraction: 0,
            symbol: false
        },
        'UYU': {
            text: 'Peso Uruguayo',
            fraction: 2,
            symbol: '$U'
        },
        'UZS': {
            text: 'Uzbekistan Sum',
            fraction: 2,
            symbol: 'лв'
        },
        'VUV': {
            text: 'Vatu',
            fraction: 0,
            symbol: false
        },
        'VEF': {
            text: 'Bolivar',
            fraction: 2,
            symbol: 'Bs'
        },
        'VND': {
            text: 'Dong',
            fraction: 0,
            symbol: '₫'
        },
        'YER': {
            text: 'Yemeni Rial',
            fraction: 2,
            symbol: '﷼'
        },
        'ZMW': {
            text: 'Zambian Kwacha',
            fraction: 2,
            symbol: false
        },
        'ZWL': {
            text: 'Zimbabwe Dollar',
            fraction: 2,
            symbol: '$'
        }
    };

    var digitsToLetters = {
        "971": "AFN",
        "978": "EUR",
        "008": "ALL",
        "012": "DZD",
        "840": "USD",
        "973": "AOA",
        "032": "ARS",
        "051": "AMD",
        "533": "AWG",
        "036": "AUD",
        "944": "AZN",
        "044": "BSD",
        "048": "BHD",
        "050": "BDT",
        "052": "BBD",
        "974": "BYR",
        "084": "BZD",
        "060": "BMD",
        "064": "BTN",
        "356": "INR",
        "068": "BOB",
        "984": "BOV",
        "977": "BAM",
        "072": "BWP",
        "578": "NOK",
        "986": "BRL",
        "096": "BND",
        "975": "BGN",
        "108": "BIF",
        "132": "CVE",
        "116": "KHR",
        "124": "CAD",
        "136": "KYD",
        "990": "CLF",
        "152": "CLP",
        "156": "CNY",
        "170": "COP",
        "970": "COU",
        "174": "KMF",
        "976": "CDF",
        "554": "NZD",
        "188": "CRC",
        "191": "HRK",
        "931": "CUC",
        "192": "CUP",
        "532": "ANG",
        "203": "CZK",
        "208": "DKK",
        "262": "DJF",
        "214": "DOP",
        "818": "EGP",
        "222": "SVC",
        "232": "ERN",
        "230": "ETB",
        "238": "FKP",
        "242": "FJD",
        "953": "XPF",
        "270": "GMD",
        "981": "GEL",
        "936": "GHS",
        "292": "GIP",
        "320": "GTQ",
        "826": "GBP",
        "324": "GNF",
        "328": "GYD",
        "332": "HTG",
        "340": "HNL",
        "344": "HKD",
        "348": "HUF",
        "352": "ISK",
        "360": "IDR",
        "960": "XDR",
        "364": "IRR",
        "368": "IQD",
        "376": "ILS",
        "388": "JMD",
        "392": "JPY",
        "400": "JOD",
        "398": "KZT",
        "404": "KES",
        "408": "KPW",
        "410": "KRW",
        "414": "KWD",
        "417": "KGS",
        "418": "LAK",
        "422": "LBP",
        "426": "LSL",
        "710": "ZAR",
        "430": "LRD",
        "434": "LYD",
        "756": "CHF",
        "446": "MOP",
        "807": "MKD",
        "969": "MGA",
        "454": "MWK",
        "458": "MYR",
        "462": "MVR",
        "478": "MRO",
        "480": "MUR",
        "965": "XUA",
        "484": "MXN",
        "979": "MXV",
        "498": "MDL",
        "496": "MNT",
        "504": "MAD",
        "943": "MZN",
        "104": "MMK",
        "516": "NAD",
        "524": "NPR",
        "558": "NIO",
        "566": "NGN",
        "512": "OMR",
        "586": "PKR",
        "590": "PAB",
        "598": "PGK",
        "600": "PYG",
        "604": "PEN",
        "608": "PHP",
        "985": "PLN",
        "634": "QAR",
        "946": "RON",
        "643": "RUB",
        "810": "RUR",
        "646": "RWF",
        "654": "SHP",
        "882": "WST",
        "678": "STD",
        "682": "SAR",
        "941": "RSD",
        "690": "SCR",
        "694": "SLL",
        "702": "SGD",
        "994": "XSU",
        "090": "SBD",
        "706": "SOS",
        "728": "SSP",
        "144": "LKR",
        "938": "SDG",
        "968": "SRD",
        "748": "SZL",
        "752": "SEK",
        "947": "CHE",
        "948": "CHW",
        "760": "SYP",
        "901": "TWD",
        "972": "TJS",
        "834": "TZS",
        "764": "THB",
        "776": "TOP",
        "780": "TTD",
        "788": "TND",
        "949": "TRY",
        "934": "TMT",
        "800": "UGX",
        "980": "UAH",
        "784": "AED",
        "997": "USN",
        "940": "UYI",
        "858": "UYU",
        "860": "UZS",
        "548": "VUV",
        "937": "VEF",
        "704": "VND",
        "886": "YER",
        "967": "ZMW",
        "932": "ZWL",
        "955": "XBA",
        "956": "XBB",
        "957": "XBC",
        "958": "XBD",
        "963": "XTS",
        "999": "XXX",
        "959": "XAU",
        "964": "XPD",
        "962": "XPT",
        "961": "XAG"
    };

    function getCurrencyByCode(code) {
        if(/^\d+$/.test(code))
            code = digitsToLetters[code];
        return currencies[code.toUpperCase()];
    }

    return {

        /**
         * retrieves the object holding currency, code and fraction information about a currency.
         *
         * @param string code
         * @return object
         */
        getCurrencyByCode: getCurrencyByCode,

        /**
         * Обрезает сумму до нужной точности
         * @param code
         * @param value
         * @returns {Number}
         */
        formatValue: function(code, value){
            var info = getCurrencyByCode(code);
            return parseFloat(value.toFixed(info.fraction));
        },

        /**
         * Возвращает символ валюты
         * @param code
         * @returns {*}
         */
        getCurrencySymbol: function(code){
            var info = getCurrencyByCode(code);
            return info.symbol || digitsToLetters[code] || code;
        }
    };
})();