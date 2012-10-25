function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

function checkEmpty (param, error) {
    if (!param || param == '')
        throw new AnyBalance.Error (error);
}

var replaceTagsAndSpaces = [/<!--[\s\S]*?-->/, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>/ig, function(str, name){
        var value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode);
        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        params[name] = value;
    });
    return params;
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

