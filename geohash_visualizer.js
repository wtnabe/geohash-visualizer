(function() {
  /**
   * Utilities for location.hash
   */ 
  var Lh = {
    SEPARATOR:          ',',
    DEFAULT_ZOOM_LEVEL: 14,
    DEFAULT_GEOHASH:    'xn3pvxy',

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
    geohash: function () {
      var geohash = this.lh().split( this.SEPARATOR )[0];
      if ( !geohash ) {
        geohash = this.DEFAULT_GEOHASH;
      }
      return geohash;
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
     * @param  string geohash
     * @param  string zoom
     * @return string
     */
    set: function( geohash, zoom ) {
      location.hash = geohash + this.SEPARATOR + zoom;
    }
  };

  /**
   * Utilities for google.maps
   */
  var Gmap = {
    map:      null,
    mapid:    'map',
    polygon:  null,
    geocoder: null,

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
      var geohash = Lh.geohash();
      var l       = decodeGeoHash( geohash );
      this.map = new google.maps.Map( document.getElementById( this.mapid ), {
        center:    new google.maps.LatLng( l.latitude[2], l.longitude[2] ),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoom:      Lh.zoom()
      });
      this.draw_square( geohash );
    },

    /**
     * @param  string geohash
     * @return void
     */
    draw_square: function( geohash ) {
      if ( this.polygon ) {
        this.polygon.setMap( null );
      }
      this.polygon = new google.maps.Polygon({
        paths: this.square_path( geohash )
      });
      this.polygon.setMap( this.map );
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
    }
  };

  /**
   * I/O for Information Bar in HTML
   */
  var Infobar = {
    get: function( id ) {
      return $('#' + id).val();
    },
    set: function( id, val ) {
      $('#' + id).val( val );
    }
  };

  function dispatch() {
    google.maps.event.addDomListener( window, 'load', function() {
      Gmap.draw_map();
      refresh_info();
      set_geohash_drawer();
      google.maps.event.addListener( Gmap.map, 'zoom_changed', function() {
        setTimeout( function() {
          refresh_info();
          set_geohash_drawer();
        }, 0 );
      });
    });

    jQuery( document ).ready( function( $ ) {
      refresh_info();

      /**
       * Changer for location.hash and map from Infobar values
       */
      $('#geoform').bind( 'submit', function( e ) {
        Lh.set( Infobar.get( 'geohash' ), Infobar.get( 'zoom' ) );
        Gmap.draw_map();
        set_geohash_drawer();
        return false;
      });
      $('#geocode').bind( 'submit', function( e ) {
        set_addr( Infobar.get( 'address' ) );
        e.stopPrepagation;
        return false;
      });
    });
  }

  function set_geohash_drawer() {
    google.maps.event.addListener( Gmap.map, 'center_changed', function() {
      var geohash = new_geohash();
      Gmap.draw_square( geohash );
      Infobar.set( 'geohash', geohash );
      Lh.set( geohash, Gmap.zoom() );
    });
  }

  function refresh_info() {
    Lh.set( $('#geohash').val(), Gmap.zoom() );
    Infobar.set( 'geohash', Lh.geohash() );
    Infobar.set( 'zoom', Gmap.zoom() );
  }

  function new_geohash() {
    var len     = Lh.geohash().length;
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
        Lh.set( geohash, Gmap.zoom() );
        Infobar.set( 'geohash', geohash );
        Gmap.draw_map();
        set_geohash_drawer();
      } else {
        return false;
      }
    });
  }

  dispatch();
})();
