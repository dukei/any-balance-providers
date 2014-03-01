/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
*/
function onChangeType(){

	var props = AnyBalance.getPreferenceProperties({
		type: {value: ''},
		login: {visible: ''},
		pass: {visible: ''},
		account: {visible: ''},
		pamm: {visible: ''},
		index: {visible: ''},
		limit: {visible: ''}
	});

	if(props.type.value == 2){
		AnyBalance.setPreferenceProperties({
			login: {visible: false},
			pass: {visible: false},
			account: {visible: false},
			pamm: {visible: true},
			index: {visible: false},
			limit: {visible: true}
		});
	}else if(props.type.value == 3){
		AnyBalance.setPreferenceProperties({
			login: {visible: false},
			pass: {visible: false},
			account: {visible: false},
			pamm: {visible: false},
			index: {visible: true},
			limit: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			pass: {visible: true},
			account: {visible: true},
			pamm: {visible: false},
			index: {visible: false},
			limit: {visible: false}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#type', onChangeType);
	onChangeType();
}
