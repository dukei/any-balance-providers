/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_errors = {
		"validation.field.invalid": {
			"default": {
				"tmpl": "Invalid {0}",
				"params": ["field"]
			},
			"login": {
				"tmpl": "Invalid Login or Password"
			},
		 	 "departureDate": {
				"tmpl": "Invalid date format. Correct is {0}",
				"params" : ["dd.MM.yyyy"]
		 	 },
		  	"confirmEmail": {
			  "tmpl": "Username or topbonus card number is not related with email"
			}
		},
		"validation.customer.is.too.young" : "You are too young to register",
		"validation.title.not.match.to.gender": "Contradictory gender and title",
		"validation.recaptcha.invalid": "The captcha is not valid",
		"validation.account.status.incorect": "Account status is incorrect",
		"validation.web.link.already.used" : "Link already used",
		"validation.field.duplicate" : {
			"default": {
				"tmpl": "Account with this {0} already exist",
				"params": ["field"]
			},
			"email": {
				"tmpl": "Account with this e-mail already exist"
			}
		},
		"validation.account.doesnt.exists": {
			"email" : {
				"tmpl": "Account doesn't exist"
			}
		},
		"validation.field.exists": {
			"otherLoyaltyNumbersDiff": {
				"tmpl": "Invalid {0}",
				"params": ["Other loyalty number"]
			},
			"default": {
				"tmpl": "Invalid {0}",
				"params": ["field"]
			},
			"email": {
				"tmpl": "Account already exist"
			}
		},
		"validation.field.too.short": {
			"default": {
				"tmpl": "{0} cannot be less than  {1}"
			},
			"default-txt": {
				"tmpl": "{0} cannot be less than {1} characters"
			}
		},
		"validation.field.too.long": {
			"default": {
				"tmpl": "{0} cannot be greater than  {1}"
			},
			"default-txt": {
				"tmpl": "{0} cannot be greater than {1} characters"
			}
		},
		"validation.fields.identical": {
			"departure": {
				"tmpl": "{0} and {1} are the same",
				"params": ["Departure", "Destination"]
			},
			"default": {
				"tmpl": "{0} are the same",
				"params": ["Fields"]
			}
		},
		"validation.fields.not.identical": {
			"email": {
				"tmpl": "{0} and {1} are not the same",
				"params": ["E-mail address (Login)", "Confirm e-mail address"]
			},
			"password": {
				"tmpl": "{0} and {1} are not the same",
				"params": ["Password", "Confirm password"]
			},
			"default": {
				"tmpl": "{0} are not the same",
				"params": ["Fields"]
			}
		},
		"validation.checkbox.not.checked": {
			"termAndConditionAccepted": {
				"tmpl": "T&C has not been accepted"
			}
		},
	    "validation.date.not.after": {
			"dateOfBirth" : {
				"tmpl" : "Date of birth cannot be from future"
			}
		},
		"validation.date.not.before": "Future dates are not supported",
		"validation.field.required": {
			"default": {
				"params": ["Field"],
				"tmpl": "{0} is empty"
			}
		},
	  	"validation.field.not.exists":{
		  "cardNumber" : {
			"params": ["Recipient card number"],
			"tmpl" : "{0} doesn't exist"
			},
      		"partnerCardNumber" : {
        	"params": ["Recipient card number"],
       		"tmpl" : "{0} doesn't exist"
      		}
		},
		"validation.field.is.number":{
			"default" :{
        	"tmpl" : "Field must be a number"
        	},
		  	"partnerCardNumber" : {
			  "tmpl" : "Field must be a number"
			}
    	},
	  	"validation.points.too.few":{
		  "points" :{
			"tmpl" : "You don't have enough miles"
		  }
		},
		"validation.field.wrong.value":{
      		"email" :{
        		"tmpl" : "Incorrect email"
      		},
            "points" :{
            "tmpl" : "Field format is invalid"
            }
    	},
	  "validation.points.below.min.transfer.miles":{
		"points": {
		  "tmpl": "You are trying to transfer mile below the minimum value"
		}
	  },
	  "validation.card.number.is.the.same":{
		"cardNumber" :{
		  "tmpl" : "You can't transfer miles for yourself"
		}
	  },
	  "validation.points.above.max.transfer.miles.per.year":{
		"points" :{
		  "tmpl" : "You are trying to transfer mile above the maximum value per year"
		}
	  },
	  "validation.promotion.code.already.used":{
		"code" :{
		  "tmpl" : "Promotion code already used"
		}
	  },
	  "validation.field.departureDate.max.retro.delay":{
		"departureDate" :{
		  "tmpl" : "Retro claim can not be requested earlier than 180 days after departure date."
		}
	  },
	  "validation.old.password.invalid":{
		"oldPassword" :{
		  "tmpl" : "The password can't be changed (wrong old password given?)."
		}
	  },
	  "validation.old.and.new.password.invalid":{
		"oldPassword" : {
		  "tmpl" : "The old and new password must differ."
		}
	  },
	  "validation.field.code.promotion.expired":{
		"code" :{
		  "tmpl" : "Promotion has expired"
		}
	  },
	  "validation.date.invalid.format" : {
		"departureDate" : {
		  "tmpl": "Invalid date format. Correct is {0}"
		}
	  },
	  "validation.date.not.beetwin.min.or.max.delay" : {
		"departureDate" : {
		  "tmpl": "Retro claim can be requested between dates {0}"
		}
	  },
	  "validation.dest.account.status.incorect" : {
		"cardNumber" : {
		  "tmpl": "Destination account status is invalid"
		}
	  },
	  "validation.status.too.soon.to.change" : {
		"destination" :{
		  "tmpl": "Too soon to change my route"
		}
	  },
	  "validation.token.invalid" : {
		"reminderLink" : {
		  "tmpl" : "Reminder link is invalid"
		}
	  },
	  "validation.web.link.timed.out" : {
		"reminderLink" : {
		  "tmppl" : "Reminder link time out"
		}
	  },
		"session.expired": "Session already expired",
		"validation.retroclaim.voucher.silver.inactive": "You have no vouchers allowing you to order silver card for your partner. Please contact Customer Support",
		"validation.retroclaim.voucher.not.correspond": "First and last name don't correspond with the card holder of the entered topbonus number. Please verify.",
		"validation.retroclaim.voucher.alreadyordered": "Your last order is currently being processed. Please check back again when it is finished.",
		"validation.voucher.silver.samemember": "You cannot give Silver voucher to yourself."
};

function formatError(error){
	if (!String.prototype.format) {
		String.prototype.format = function (args) {
			return this.replace(/{(\d+)}/g, function (match, number) {
				var arg = args[number];

				return typeof args[number] != 'undefined'
						? args[number]
						: match;
			});
		};
	}

	var errorMsg = g_errors[error.code], text;
	if(!errorMsg){
		text = 'Unknown error';
	} else if(typeof errorMsg === "string") {
		// no format
		text = errorMsg;
	} else if (errorMsg[error.field]) {
		var params = [];
		// format with field's values from json
		var params = errorMsg[error.field].params ? errorMsg[error.field].params : [];
		if (params.length == 0) {
			if (error.param) {
				params =  params.concat(error.param);
			}
		}
		text = errorMsg[error.field].tmpl.format(params);
	} else if (errorMsg["default"] && errorMsg["default"].tmpl && (text = error.field)) {
		// format with label
		var errorParams = error.param || [];
		text = errorMsg["default"].tmpl.format([text].concat(errorParams));
	} else if (errorMsg["default"] && errorMsg["default"].tmpl && errorMsg["default"].params) {
		// format with defaults from json
		var params = errorMsg["default"].params ? errorMsg["default"].params : [];
		text = errorMsg["default"].tmpl.format(params);
	}
	return text;
}

function formatErrors(errors){
	var errs = [];
	for(var i=0; i<errors.length; ++i){
		errs.push(formatError(errors[i]));
	}
	return errs.join(';\n');
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://topbonus.airberlin.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter username / topbonus card number!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + '/web/tb/login?locale=en_US', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting provider site! Try to refresh later.');
	}
	
	html = AnyBalance.requestPost(baseurl + '/web/airberlin-login', JSON.stringify({
		login: prefs.login,
		password: prefs.password
	}), addHeaders({'X-Requested-With': 'XMLHttpRequest', Origin: baseurl, Referer: baseurl + '/web/tb/login?locale=en_US'}));

	var token = getJson(html);
	
	if (!token.access_token) {
		var error = formatErrors(token.errors);
		if (error)
			throw new AnyBalance.Error(error, null, /Invalid Login or Password/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
	}

	var headers = {
		Authorization: 'Bearer ' + token.access_token,
		'Content-Type': 'application/json; charset=UTF-8;',
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'Accept-Language': 'en-us',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + '/web/tb/login?locale=en_US'
	};

	AnyBalance.setCookie('topbonus.airberlin.com', '_authtoken', token.access_token);//; validAuthorization=%2Fweb%2Ftb%2Flogin

	var result = {success: true};

	var join_space = create_aggregate_join(' ');

	html = AnyBalance.requestGet(baseurl + '/airberlin-rest/customers?_=' + new Date().getTime(), addHeaders(headers));
	var json = getJson(html);
	//Тут ещё есть много инфы, вообще:
	//{"accountNumber":999999999,"id":999999999,"lngCode":"en-us","status":"A","email":"email@gmail.com","retypeEmail":null,"login":"LOGIN","password":null,"retypePassword":null,"sex":"M","title":"MR","firstName":"NAME","secondName":null,"lastName":"FAMILY","suffix":null,"dateOfBirth":"16/01/1976","companyName":null,"positionInCompany":null,"preferredLanguage":"ENG","addressDefault":"H","address":[{"type":"ADDRESS_TYPE_HOME","street":"25 let VLKSM 48/1- 49","street2":null,"street3":null,"city":"MOSKOW","country":"RUS","province":null,"zipCode":"355042"},{"type":"ADDRESS_TYPE_BUSINESS","street":null,"street2":null,"street3":null,"city":null,"country":null,"province":null,"zipCode":null}],"phone":null,"phoneType":null,"phoneAlternate":"4099187","phoneAlternateType":"H","faxNumber":null,"typeId":null,"subTypeId":1,"enrollmentCode":null,"enrollmentChannel":"W","permissionCC":true,"permissionEmail":true,"permissionPhone":false,"permissionPost":false,"permissionSms":false,"termAndConditionAccepted":true,"statementPreference":"E","fbUserId":null,"description":null,"extendedAttributes":{"CRH_EXT_TB_CCARD":"0","CRH_EXT_STATUS_MATCH":null,"CRH_EXT_DTC_MONTHLY_SUBSCRIPT":null,"CRH_EXT_BUSIN_ADD_P_O_BOX":null,"CRH_EXT_OTHER":"0","CRH_EXT_HONOURS":null,"CRH_EXT_TB_STATEMENT":"0","CRH_EXT_INVALID_EMAIL":"0","CRH_EXT_FIRST_NAME_LATIN":"ANDREY","CRH_EXT_POWER_OF_AUTHORITY":null,"CRH_EXT_CAR":"0","CRH_EXT_INVALID_ADDRESS":"0","CRH_EXT_TB_NEWSLETTER":"0","CRH_EXT_HOTEL":"0","CRH_EXT_PIN":"9999","CRH_EXT_LAST_NAME_LATIN":"FAIMILI","CRH_EXT_BUSIN_ADD_CITY_LATIN":null,"CRH_EXT_CO_BRAND_CRE_CARD_REQ":"0","CRH_EXT_ALTERNATE_EMAIL":null,"CRH_EXT_NAME_SUFFIX":null,"CRH_EXT_NICKNAME":null,"CRH_EXT_EMBOSSED_NAME":"NAME FAMILY","CRH_EXT_SALUTATION":"M_MR","CRH_EXT_TB_ALONES":"0","CRH_EXT_CALL_CENTER_PASSWORD":"9999","CRH_EXT_PHONE_NBR_CITY_CODE":null,"CRH_EXT_PREFERRED_SEATS":null,"CRH_EXT_TB_SNAP":"0","CRH_EXT_HOME_ADD_CITY_LATIN":"MOSCOW","CRH_EXT_EMAIL_VALIDATED":"0","CRH_EXT_SERVICE_CARD_REQUESTED":"0","CRH_EXT_HOME_ADD_P_O_BOX":null,"CRH_EXT_PHONE_NBR_INT_DIAL_COD":null,"CRH_EXT_ELIT_CHALL_START_DATE":null,"CRH_EXT_AL_PH_NBR_INT_DIAL_COD":"KAZ","CRH_EXT_VIP_STATUS":"000000000000000000000000000000","CRH_EXT_STATUS_MATCH_DATE":null,"CRH_EXT_MOTHER_MAIDEN_NAME":null,"CRH_EXT_AL_PHONE_NBR_CITY_CODE":"962"},"homeAirportAirId":null,"favAirport1AirId":null,"favAirport2AirId":null,"membershipStartDate":1417647600000,"migratedMember":false,"over18":true,"incompleteData":false,"partnerCode":null,"enrollmentPartnerCode":"MIGRATION","socialCommunicationPermissions":null,"otherLoyaltyNumbers":[],"otherLoyaltyNumbersDiff":[],"displayNumber":"174182435","cardNo":"999999999","referringMembershipNumber":null,"invitationId":null,"newCard":null,"accType":null,"socialAuthKey":null,"socialChannel":null,"quickEnroll":false,"recaptchaResponse":null}
	sumParam(json.cardNo, result, '__tariff', null, null, null, aggregate_join);
	getParam(json.cardNo, result, 'num');

	html = AnyBalance.requestGet(baseurl + '/airberlin-rest/profileInfo/pointsInfoShort?_=' + new Date().getTime(), addHeaders(headers));
	json = getJson(html);
	
	getParam(json.pointsBalance, result, 'balance');
	getParam(json.points.upgradePoints, result, 'status_miles');
	getParam(json.points.upgradePtsToBeAchieved, result, ['status_miles_total', 'status_miles']);
	getParam(json.points.upgradeSegments, result, 'status_segments');
	getParam(json.points.upgradeSegToBeAchieved, result, ['status_segments_total', 'status_segments']);
	sumParam(json.points.currentTierName, result, '__tariff', null, null, null, aggregate_join);

	sumParam(json.firstName, result, 'fio', null, null, null, join_space);
	sumParam(json.lastName, result, 'fio', null, null, null, join_space);
	
	AnyBalance.setResult(result);
}