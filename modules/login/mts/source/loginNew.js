var g_baseurlLogin = 'https://login.mts.ru';

function enterLKNew(options){
	var baseurl = options.baseurl || g_baseurl;
    var loginUrl = options.url = options.url || g_baseurlLogin + "/amserver/json/authenticate?authIndexType=service&authIndexValue=login-spa";
    var allowRetry = options.allowRetry;
	
	var recipient = getParam(options.login, null, null, null, [/.*(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4']);
	
	html = AnyBalance.requestPost(loginUrl, null, addHeaders({
		'Accept': '*/*',
        'Accept-API-Version': 'resource=4.0, protocol=1.0',
		'Content-Type': 'application/json',
		'Origin': 'https://login.mts.ru',
		'Referer': 'https://login.mts.ru/amserver/NUI/'
	}));
	
	if (!html || AnyBalance.getLastStatusCode() >= 500) {
        throw new AnyBalance.Error('Личный кабинет МТС временно недоступен. Попробуйте ещё раз позже.', allowRetry);
	}
	
	var json = getJson(html);
//	AnyBalance.trace('Проверка доступа: ' + JSON.stringify(json));

    if(!json.header){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся зайти в личный кабинет. Он изменился или проблемы на сайте.', allowRetry);
    }
	
	var id = json.authId;
	var header = json.header;
	if (header)
		AnyBalance.trace('Progress header: ' + header);
	
	if (json.header == "trusted-network") {
		html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "authId": id,
            "template": "NetworkHeaderRedirect.jsp",
            "stage": "login-nodes-dslnull",
            "header": "trusted-network",
            "infoText": null,
            "callbacks": [
                {
                    "type": "ConfirmationCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Confirm"
                        },
                        {
                            "name": "messageType",
                            "value": 0
                        },
                        {
                            "name": "options",
                            "value": [
                                "IGNORE",
                                "OK"
                            ]
                        },
                        {
                            "name": "optionType",
                            "value": -1
                        },
                        {
                            "name": "defaultOption",
                            "value": 1
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken1",
                            "value": 1
                        }
                    ]
                },
                {
                    "type": "MetadataCallback",
                    "output": [
                        {
                            "name": "data",
                            "value": {
                                "acceptableOperators": [
                                   "MTS",
                                    "OTHER"
                                ],
                                "hiddenLogo": false,
                                "restrictXTethered": true,
                                "acceptableOperatorsErrorMessage": "Введен неверный номер телефона.",
                                "accessConditions": "https://static.ssl.mts.ru/mts_rf/images/usloviya-edinogo-dostupa-k-servisam-MTS.html",
                                "correlationID": "7cef4c35-5349-4fe6-8f0f-7db3237b8fad",
                                "label": "Введите номер телефона",
                                "turnOffFeedbackService": true,
                                "feedbackServiceUrl": "feedback-prod.stage2.websso.msk.mts.ru"
                            }
                        }
                    ]
                }
            ]
        }), addHeaders({
	    	'Accept': '*/*',
            'Accept-API-Version': 'resource=4.0, protocol=1.0',
	    	'Content-Type': 'application/json',
	    	'Origin': 'https://login.mts.ru',
	    	'Referer': 'https://login.mts.ru/amserver/NUI/'
	    }));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Проверка сети: ' + JSON.stringify(json));
	
        var header = json.header;
		if (header)
		    AnyBalance.trace('Progress header: ' + header);
	}
			
	if (json.header == "network-header") {
		html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "authId": id,
            "template": "NetworkHeader.jsp",
            "stage": "login-nodes-dslnull",
            "header": "network-header",
            "infoText": null,
            "callbacks": [
                {
                    "type": "TextInputCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "UUID"
                        },
                        {
                            "name": "defaultText",
                            "value": ""
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken1",
                            "value": ""
                        }
                    ]
                },
                {
                    "type": "ConfirmationCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Confirm"
                        },
                        {
                            "name": "messageType",
                            "value": 0
                        },
                        {
                            "name": "options",
                            "value": [
                                "IGNORE",
                                "OK"
                            ]
                        },
                        {
                            "name": "optionType",
                            "value": -1
                        },
                        {
                            "name": "defaultOption",
                            "value": 0
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken2",
                            "value": 1
                        }
                    ]
                },
                {
                    "type": "MetadataCallback",
                    "output": [
                        {
                            "name": "data",
                            "value": {
                                "acceptableOperators": [
                                    "MTS",
                                    "OTHER"
                                ],
                                "hiddenLogo": false,
                                "restrictXTethered": true,
                                "acceptableOperatorsErrorMessage": "Введен неверный номер телефона.",
                                "accessConditions": "https://static.ssl.mts.ru/mts_rf/images/usloviya-edinogo-dostupa-k-servisam-MTS.html",
                                "correlationID": "866453b2-21c9-4e6b-a112-b20aff8b695e",
                                "label": "Введите номер телефона",
                                "turnOffFeedbackService": true,
                                "feedbackServiceUrl": "feedback-prod.stage2.websso.msk.mts.ru"
                            }
                        }
                    ]
                }
            ]
        }), addHeaders({
	    	'Accept': '*/*',
            'Accept-API-Version': 'resource=4.0, protocol=1.0',
	    	'Content-Type': 'application/json',
	    	'Origin': 'https://login.mts.ru',
	    	'Referer': 'https://login.mts.ru/amserver/NUI/'
	    }));
	
	    var json = getJson(html);
//      AnyBalance.trace('Проверка сети МТС: ' + JSON.stringify(json));
	
	    var header = json.header;
		if (header)
		    AnyBalance.trace('Progress header: ' + header);
	}
	    
	if (json.header == "enter-phone") {
	    html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "authId": id,
            "template": "EnterPhone.jsp",
            "stage": "login-nodes-dslnull",
            "header": "enter-phone",
            "infoText": null,
            "callbacks": [
                {
                    "type": "NameCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Введите номер телефона"
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken1",
                            "value": "7" + options.login
                        }
                    ]
                },
                {
                    "type": "ConfirmationCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Confirm"
                        },
                        {
                            "name": "messageType",
                            "value": 0
                        },
                        {
                            "name": "options",
                            "value": [
                                "IGNORE",
                                "OK"
                            ]
                        },
                        {
                            "name": "optionType",
                            "value": -1
                        },
                        {
                            "name": "defaultOption",
                            "value": 0
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken2",
                            "value": 1
                        }
                    ]
                },
                {
                    "type": "MetadataCallback",
                    "output": [
                        {
                            "name": "data",
                            "value": {
                                "acceptableOperators": [
                                    "MTS",
                                    "OTHER"
                                ],
                                "hiddenLogo": false,
                                "restrictXTethered": true,
                                "acceptableOperatorsErrorMessage": "Введен неверный номер телефона.",
                                "accessConditions": "https://static.ssl.mts.ru/mts_rf/images/usloviya-edinogo-dostupa-k-servisam-MTS.html",
                                "correlationID": "7cef4c35-5349-4fe6-8f0f-7db3237b8fad",
                                "label": "Введите номер телефона",
                                "turnOffFeedbackService": true,
                                "feedbackServiceUrl": "feedback-prod.stage2.websso.msk.mts.ru"
                            }
                        }
                    ]
                }
            ]
        }), addHeaders({
	    	'Accept': '*/*',
            'Accept-API-Version': 'resource=4.0, protocol=1.0',
	    	'Content-Type': 'application/json',
	    	'Origin': 'https://login.mts.ru',
	    	'Referer': 'https://login.mts.ru/amserver/NUI/'
	    }));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Отправка номера телефона: ' + JSON.stringify(json));
	
	    var header = json.header;
		if (header)
		    AnyBalance.trace('Progress header: ' + header);
	}
		
	if (json.header == "verify-password") {
	    html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "authId": id,
            "template": "VerifyPassword.jsp",
            "stage": "login-nodes-dslnull",
            "header": "verify-password",
            "infoText": null,
            "callbacks": [
                {
                    "type": "PasswordCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Verify password"
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken1",
                            "value": options.password
                        }
                    ]
                },
                {
                    "type": "ConfirmationCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Confirm"
                        },
                        {
                            "name": "messageType",
                            "value": 0
                        },
                        {
                            "name": "options",
                            "value": [
                                "IGNORE",
                                "OK",
                                "RESTART",
                                "RESTORE"
                            ]
                        },
                        {
                            "name": "optionType",
                            "value": -1
                        },
                        {
                            "name": "defaultOption",
                            "value": 0
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken2",
                            "value": 1
                        }
                    ]
                },
                {
                    "type": "MetadataCallback",
                    "output": [
                        {
                            "name": "data",
                            "value": {
                                "lockoutCount": 3,
                                "hiddenLogo": false,
                                "numberType": "MOBILE",
                                "restrictXTethered": true,
                                "acceptableOperatorsErrorMessage": "Введен неверный номер телефона.",
                                "accessConditions": "https://static.ssl.mts.ru/mts_rf/images/usloviya-edinogo-dostupa-k-servisam-MTS.html",
                                "label": "Введите номер телефона",
                                "abonent": "mMTS",
                                "userId": "c25f25f0-588d-11ea-98aa-b9cf018c481e",
                                "acceptableOperators": [
                                    "MTS",
                                    "OTHER"
                                ],
                                "invalidCount": 0,
                                "recipient": recipient,
                                "authUserLevel": "1",
                                "correlationID": "7cef4c35-5349-4fe6-8f0f-7db3237b8fad",
                                "turnOffFeedbackService": true,
                                "feedbackServiceUrl": "feedback-prod.stage2.websso.msk.mts.ru"
                            }
                        }
                    ]
                }
            ]
        }), addHeaders({
	    	'Accept': '*/*',
            'Accept-API-Version': 'resource=4.0, protocol=1.0',
	    	'Content-Type': 'application/json',
	    	'Origin': 'https://login.mts.ru',
	    	'Referer': 'https://login.mts.ru/amserver/NUI/'
	    }));
	
	    var json = getJson(html);
//		AnyBalance.trace('Отправка пароля: ' + JSON.stringify(json));

        var header = json.header;
		if (header)
		    AnyBalance.trace('Progress header: ' + header);
	}
	
	if (json.header == "verify-otp") {
		AnyBalance.trace('МТС запросил проверку с помощью кода из SMS');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + recipient + '\n\nЕсли вы не хотите постоянно вводить SMS-пароли при входе, выберите способ входа "Пароль" в настройках безопасности вашего личного кабинета МТС', null, {inputType: 'number', time: 300000});
	    html = AnyBalance.requestPost(loginUrl, JSON.stringify({
            "authId": id,
            "template": "VerifyOTP.jsp",
            "stage": "login-nodes-dslnull",
            "header": "verify-otp",
            "infoText": null,
            "callbacks": [
                {
                    "type": "PasswordCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Verify otp"
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken1",
                            "value": code
                        }
                    ]
                },
                {
                    "type": "ConfirmationCallback",
                    "output": [
                        {
                            "name": "prompt",
                            "value": "Confirm"
                        },
                        {
                            "name": "messageType",
                            "value": 0
                        },
                        {
                            "name": "options",
                            "value": [
                                "IGNORE",
                                "OK",
                                "RESTART",
                                "REFRESH",
                                "CANTGET"
                            ]
                        },
                        {
                            "name": "optionType",
                            "value": -1
                        },
                        {
                            "name": "defaultOption",
                            "value": 0
                        }
                    ],
                    "input": [
                        {
                            "name": "IDToken2",
                            "value": 1
                        }
                    ]
                },
                {
                    "type": "MetadataCallback",
                    "output": [
                        {
                            "name": "data",
                            "value": {
                                "hiddenLogo": false,
                                "numberType": "MOBILE",
                                "restrictXTethered": true,
                                "retryCount": 3,
                                "isAux": false,
                                "acceptableOperatorsErrorMessage": "Введен неверный номер телефона.",
                                "channel": "SMS",
                                "accessConditions": "https://static.ssl.mts.ru/mts_rf/images/usloviya-edinogo-dostupa-k-servisam-MTS.html",
                                "label": "Введите номер телефона",
                                "abonent": "mMTS",
                                "userId": "dfcc9720-019a-11ea-88ba-339a25f0d609",
                                "acceptableOperators": [
                                    "MTS",
                                    "OTHER"
                                ],
                                "invalidCount": 0,
                                "recipient": recipient,
                                "authUserLevel": "0",
                                "correlationID": "01a59697-d872-4a42-a3b3-c86877ad4bc8",
                                "isRestoreMode": false,
                                "turnOffFeedbackService": true,
                                "feedbackServiceUrl": "feedback-prod.stage2.websso.msk.mts.ru"
                            }
                        }
                    ]
                }
            ]
        }), addHeaders({
	    	'Accept': '*/*',
            'Accept-API-Version': 'resource=4.0, protocol=1.0',
	    	'Content-Type': 'application/json',
	    	'Origin': 'https://login.mts.ru',
	    	'Referer': 'https://login.mts.ru/amserver/NUI/'
	    }));
	
	    var json = getJson(html);
//    	AnyBalance.trace('Отправка кода из SMS: ' + JSON.stringify(json));
	
	    var header = json.header;
		if (header)
		    AnyBalance.trace('Progress header: ' + header);
	}
		
	if (json.header == "verify-otp") {
		var retryCount = json.callbacks[2].output[0].value.retryCount;
		var invalidCount = json.callbacks[2].output[0].value.invalidCount;
		var restCount = retryCount - invalidCount;
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Неверный код! Осталось попыток: ' + restCount);
	}
	
	if (json.tokenId && json.successUrl) {
		AnyBalance.trace('Успешно вошли: ' + JSON.stringify(json));
		var tokenId = json.tokenId;
		var successUrl = json.successUrl;
		html = AnyBalance.requestGet(successUrl, addHeaders({Referer: 'https://login.mts.ru/'}));
	} else {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Неверный логин или пароль!', allowRetry);
	}

    return html;
}

