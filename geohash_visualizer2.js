(function() {
  var DEBUG = false;

  /**
   * Utilities for location.hash
   */ 
  var Lh = {
    SEPARATOR:          ',',
    DEFAULT_ZOOM_LEVEL: 14,
    DEFAULT_GEOHASH:    'xn3pvxy',
    DEFAULT_WIDTH:      '500',
    DEFAULT_HEIGHT:     '400',

    /**
     * right location hash string
     */
    lh: function() {
      return location.hash.substr( 1 );
    },

    /**
     * extract geohash from location.hash
     *
     * @return string
     */
    latlng: function () {
      var latlng = this.lh().split( this.SEPARATOR )[0];
      if ( !latlng ) {
        latlng = $.isArray( this.DEFAULT_GEOHASH ) ? this.DEFAULT_GEOHASH[0] : this.DEFAULT_GEOHASH;
      }
      return latlng;
    },

    /**
     * extract google maps' zoom level from location.hash
     *
     * @return int
     */
    zoom: function() {
      var zoom = this.lh().split( this.SEPARATOR )[1];
      if ( !zoom ) {
        zoom = this.DEFAULT_ZOOM_LEVEL;
      }
      return zoom - 0;
    },

    /**
     * extract DOM width for google maps
     *
     * @return int
     */
    width: function() {
      var width = this.lh().split( this.SEPARATOR )[2];
      if ( !width ) {
        width = this.DEFAULT_WIDTH;
      }
      return width - 0;
    },

    /**
     * extract DOM height for google maps
     *
     * @return int
     */
    height: function() {
      var height = this.lh().split( this.SEPARATOR )[3];
      if ( !height ) {
        height = this.DEFAULT_HEIGHT;
      }
      return height - 0;
    },

    /**
     * @param  string geohash
     * @param  int    zoom
     * @param  int    width
     * @param  int    height
     * @return string
     */
    set: function( geohash, zoom, width, height ) {
      var hash = [geohash, zoom, width, height].join( this.SEPARATOR );
      location.hash = hash;

      return hash;
    }
  };

  /**
   * Utilities for google.maps
   */
  var Gmap = {
    map:      null,
    mapid:    'map',
    polygons: null,
    geocoder: null,
    width:    null,
    height:   null,

    /**
     * convert from geohash to google.maps.LatLng array for google.maps.Polygon
     *
     * @param  string geohash
     * @return array
     */
    square_path: function( geohash ) {
      var l    = decodeGeoHash( geohash );
      var lats = l.latitude;
      var lngs = l.longitude;
      var square_routes = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];

      return jQuery( square_routes ).map( function( i, e ) {
        return new google.maps.LatLng( lats[e[0]], lngs[e[1]] );
      });
    },

    /**
     * @return void
     */
    draw_map: function() {
      this.set_size( Lh.width(), Lh.height() );

      var geohash = Lh.latlng();
      var l       = decodeGeoHash( geohash );
      this.map = new google.maps.Map( document.getElementById( this.mapid ), {
        center:    new google.maps.LatLng( l.latitude[2], l.longitude[2] ),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoom:      Lh.zoom()
      });
      this.draw_square();
    },

    /**
     * @return void
     */
    draw_square: function() {
      if ( this.polygons ) {
        this.erase_square();
      }
      var geohashes = Infobar.get( 'geohashes' );
      if ( typeof geohashes != 'undefined' ) {
        if ( !$.isArray( geohashes ) ) {
          geohashes = [geohashes];
        }
        this.polygons = [];
        self          = this;
        jQuery.each( geohashes, function( i, e ) {
          var polygon = new google.maps.Polygon({
            paths: self.square_path( e )
          });
          polygon.setMap( self.map );
          self.polygons.push( polygon );
        });
      }
    },

    /**
     * @return void
     */
    erase_square: function() {
      if ( $.isArray( this.polygons ) ) {
        self = this;
        jQuery.each( this.polygons, function( i, e ) {
          e.setMap( null );
        });
        this.polygons = null;
      }
    },

    /**
     * @return int
     */
    zoom: function() {
      if ( this.map ) {
        return this.map.zoom;
      } else {
        return Lh.zoom();
      }
    },

    /**
     * @since  2010-09-24
     * @return int
     */
    width: function() {
      return $('#'+this.mapid).css( 'width' ).replace( /px$/, '' ) - 0;
    },

    /**
     * @since  2010-09-24
     * @return int
     */
    height: function() {
      return $('#'+this.mapid).css( 'height' ).replace( /px$/, '' ) - 0;
    },

    /**
     * geohash for entire map
     *
     * @return string
     * @bugs   dummy
     */
    geohash: function() {
      if ( this.map ) {
        var center = this.map.center;
        return encodeGeoHash( center.Oa, center.Pa );
      } else {
        return Lh.latlng();
      }
    },

    /**
     * @param int width
     * @param int height
     */
    set_size: function( width, height ) {
      $('#'+this.mapid).css( {width:  width,
                              height: height} );
    }
  };

  /**
   * I/O for Information Bar in HTML
   */
  var Infobar = {
    get: function( id ) {
      return ( id == 'geohashes' ) ? this._get_geohashes() : $('#' + id).val();
    },
    _get_geohashes: function() {
      return $('#geohashes').val().split( /\r\n|[\r\n]/ );
    },
    set: function( id, val ) {
      return ( id == 'geohashes' ) ? this._set_geohashes( val ) : $('#'+id).val( val );
    },
    _set_geohashes: function( geohashes ) {
      if ( !$.isArray( geohashes ) ) {
        geohashes = [geohashes];
      }
      return $('#geohashes').val( geohashes.join( "\n" ) );
    }
  };

  function dispatch() {
    $('#'+Gmap.mapid).ready( function() {
      Gmap.draw_map();
      refresh_info();
      google.maps.event.addListener( Gmap.map, 'zoom_changed', function() {
        setTimeout( function() {
          refresh_info();
        }, 0 );
      });
      google.maps.event.addListener( Gmap.map, 'center_changed', function() {
        Infobar.set( 'latlng', Gmap.geohash() );
        Lh.set( Gmap.geohash(), Gmap.zoom(), Gmap.width(), Gmap.height() );
      });
    });

    jQuery( document ).ready( function( $ ) {
      refresh_info();

      /**
       * Changer for location.hash and map from Infobar values
       */
      $('#mapinfo').bind( 'submit', function( e ) {
        Lh.set( Infobar.get( 'latlng' ),
                Infobar.get( 'zoom' ),
                Infobar.get( 'width' ),
                Infobar.get( 'height' ) );
        Gmap.draw_map();
        return false;
      });
      $('#geocode').bind( 'submit', function( e ) {
        set_addr( Infobar.get( 'address' ) );
        return false;
      });
      $('#geoform').bind( 'submit', function( e ) {
        Gmap.draw_square();
        return false;
      });
    });
  }

  function refresh_info() {
    Lh.set( Gmap.geohash(), Gmap.zoom(), Gmap.width(), Gmap.height() );

    Infobar.set( 'latlng', Lh.latlng() );
    Infobar.set( 'zoom', Gmap.zoom() );
    Infobar.set( 'width', Gmap.width() );
    Infobar.set( 'height', Gmap.height() );
  }

  function new_geohash() {
    var len     = Lh.latlng().length;
    var geohash = encodeGeoHash( Gmap.map.center.Oa, Gmap.map.center.Pa );

    return geohash.substr( 0, len );
  }

  function set_addr( address ) {
    new google.maps.Geocoder().geocode({
      address:  address,
      language: 'ja',
      region:   'jp'
    }, function( r, stat ) {
      if ( stat == 'OK' ) {
        var l       = r[0].geometry.location;
        var geohash = encodeGeoHash( l.Oa, l.Pa );
        Lh.set( geohash, Gmap.zoom(), Gmap.width(), Gmap.height() );
        Infobar.set( 'latlng', geohash );
        Gmap.draw_map();
      } else {
        return false;
      }
    });
  }

  dispatch();
  if ( DEBUG ) {
    setTimeout( function() {
      debugger; 
    }, 5000 );
  }
})();
