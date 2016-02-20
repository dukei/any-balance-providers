
function htmlTraversal(html) {
	var DOM_struct = [
		{
			type    : 'comment',
			content : 'тело комментария',
		},
		{
			type    : 'cdata',
			content : 'тело блока CDATA',
		},
		{
			type    : 'text',
			content : '&#x041D;&#x043E;&#x0432;&#x043E;&#x0441;&#x0442;&#x0438;',	//encoded
			content : 'Новости',	//decoded
			decoded : false
		},
		//void tag (empty, self-closing)
		{
			type  : 'tag',	
			name  : 'input',
			attrs : 'NAME=search MaxLength="30" /',  //unparsed encoded
			attrs : {  //parsed
				name      : 'search',
				maxlength : 30
			},
			decoded : {
				//type      : false, //item with FALSE doesn't need
				maxlength : true
			}
		},
		//pair tag (open and close)
		{
			type  : 'tag',
			name  : 'div',
			attrs : 'ID = "news" title="&#x041D;&#x043E;&#x0432;&#x043E;&#x0441;&#x0442;&#x0438;"',  //unparsed encoded
			attrs : {  //parsed
				id    : 'news',
				title : 'Новости'
			},
			decoded : {
				id    : true,
				title : true
			},
			children : [
				//{...}, 
				//{...}
			]
		}
	];

	var stack = [], level = 0, DOM = [], i;

	html.htmlParser(
		function(type, node, attrs) {
			//console.log([type, node, attrs]);
			switch (type) {
				case 'open':
					DOM.push({
						level : level,
						type  : 'tag',
						name  : node,
						attrs : attrs,
						children : []
					});
					stack[level] = DOM;
					DOM = [];
					level++;
					break;
				case 'close':
					level--;
					i = stack[level].length - 1;  //last element index
					stack[level][i].children = DOM;  //присоединяем текущий DOM к родительском узлу
					DOM = stack[level];  //делаем родительский DOM текущим
					stack.pop();  //необязательно, но освобождаем память
					break;
				case 'void':
					DOM.push({
						level : level,
						type  : 'tag',
						name  : node,
						attrs : attrs
					});
					break;
				case 'text':
				case 'comment':
				case 'cdata':
					DOM.push({
						level   : level,
						type    : type,
						content : node
					});
					break;
				case 'raw':
					DOM.push({
						level   : level,
						type    : 'text',
						content : node,
						decoded : true
					});
					break;
				default:
					throw Error('Unknown node type: ' + type);
			}

			/*
			if (type === 'text') node = node.htmlEntityDecode(false).normalize().clean();
			console.log([type, node, attrs]);

			if (! attrs.length) return true;
			if (! attrs.htmlAttrParser(
				function(name, value, offset) {
					value = value.htmlEntityDecode(false).normalize().clean();
					console.log([name, value, offset]);
					return true;
				}
			)) return false;
			*/

			return true;
		}
	);
	return DOM;
}
