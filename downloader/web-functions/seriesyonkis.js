var htmlparser = require('htmlparser2');
var select     = require('soupselect').select;
var TABLE_TYPE = {'LINKS': 0, 'EPISODES': 1};


//Private helper functions
var _urlParser = function( src ) {

	if ( !src ) {
		return null;
	} else {

		var i = 0;
		for (; i < src.children.length && src.children[ i ].name != 'a'; i++);
		
		if ( i === src.length ) {
			return null;
		} else {
			return src.children[ i ].attribs.href;
		}
	}

};

var _serverParser = function( server ) {

	if ( !server ) {
		return null;
	} else {

		var i = 0;
		for (; i < server.children.length && server.children[ i ].name != 'a'; i++);
		
		if ( i === server.length ) {
			return null;
		} else {
			if ( server.children[ i ].children.length > 0 ) {
				var j = 0;
				for (; j < server.children[ i ].children.length && 
						   server.children[ i ].children[ j ].name != 'img'; 
						j++
					);
				if (j === server.children[ i ].children.length) {
					return null;
				} else {
					return server.children[ i ].children[ j ].attribs.alt || server.children[ i ].children[ j ].attribs.src || null;
				}
			}
			return null;
		}
	}

};

var _langParser = function( lang ) {
	
	if ( !lang ) {
		return null;
	} else {

		var i = 0;
		for (; i < lang.children.length && lang.children[ i ].name != 'span'; i++);
		
		if ( i === lang.length ) {
			return null;
		} 
		else {
			return lang.children[ i ].attribs.title || null;
		}
	}
	
};

var _episode = function( item ) {
	
	this.src	= _urlParser( item.src );
	this.server	= _serverParser( item.server );
	this.lang	= _langParser( item.lang );
	this.valid  = !!(this.src && this.server && this.lang);

};

//Public functions
module.exports = {
	TABLE_TYPE: TABLE_TYPE,
	//============Web dependant============
	parseTable : function( htmll, callback ) {
			
		var html = htmll + '';

		if ( html.length > 0 ) {
			var tableStart = html.indexOf( '<tbody>' );/*'<table class="episodes series">' ),*/
				tableEnd   = html.indexOf( '</tbody>' );

			//Try reading from middle file
			if ( tableStart != -1 && tableEnd != -1 ) {
				//http://stackoverflow.com/questions/16441770/split-string-in-two-on-given-index-and-return-both-parts
				var table = html.substring( tableStart, tableEnd );
				var episodes = table.substring( ( table.indexOf('<tr>') - 1 ) );
				callback( null, episodes);
			} else {
				callback( 'table not found' );
			}
		} else {
			callback( 'Empty html' );
		}
	},
	prepareTable : function( table, queue, language, type ) {

		var handler = new htmlparser.DefaultHandler(function( err, dom ) {
			if ( err ) {
				return err;
			} else {
				var rows = select( dom, 'tr' );
				
				rows.forEach(function( item, idx, arr ) {
					
					var col = select( item.children, 'td' );
					if ( (col instanceof Array) && col.length > 2 ) {

						// We extract the links for current episode, one step to middleWare
						if( type === TABLE_TYPE.LINKS ){
							//Filter by lang moment
							if ( language ) {
								var l = _langParser(col[2]);
								if ( l === language ) {
									queue.push( new _episode({ src: col[0], server: col[1], lang: col[2] }), function(err){} );
								}
							} else {
								queue.push( new _episode({ src: col[0], server: col[1], lang: col[2] }), function(err){} );
							}
						}else{
							// We extract a link for each espisode on this season
							// col[ 0 ] is the first column on the row, which usually holds the link
							//console.log('got a col', _urlParser( col[0] ));
							queue.push( _urlParser( col[0] ), function(){} );
						}
					} 

				});
				return null;
			}
		});

		var parser = new htmlparser.Parser( handler );
		parser.parseComplete(table);
	},
	prepareMidWare : function( item, callback ) {
		var handler = new htmlparser.DefaultHandler(function( err, item ) {
			if ( err ) {
				return callback( err );
			} else {
				var hrefs = select( item, 'a' );
				hrefs.forEach( function( i, idx ) {
					if ( !(i.attribs.hasOwnProperty('href')) ) {
						hrefs.splice(idx, 1);
					}
				})
				return callback( null, hrefs);
			}
		});

		var parser = new htmlparser.Parser( handler );
		parser.parseComplete( item );
	}
	//====================================
}