//see license.txt
import Ol from 'ol'
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import MultiPoint from 'ol/geom/MultiPoint.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Select from 'ol/interaction/Select.js';
import {click, pointerMove, altKeyOnly} from 'ol/events/condition.js';
import {  Circle as CircleStyle,  Fill,  Stroke,  Style} from 'ol/style.js';
import Text from 'ol/style/Text';
import {  transform } from 'ol/proj.js';
import Circle from 'ol/geom/Circle';
import Feature from 'ol/Feature.js';
import {Tile as TileLayer,  VectorL} from 'ol/layer.js';
import {OSM,Vector} from 'ol/source.js';
import Overlay from 'ol/Overlay';
import {  defaults as defaultControls,  OverviewMap,  LayerSwitcher, FullScreen} from 'ol/control.js';

import * as d3 from 'd3';
import * as utils from './utils';

//import data

import clusterData from './geojson/mingwei_topics/im_cluster.geojson';
import clusterBoundaryData from './geojson/mingwei_topics/im_cluster_boundary.geojson';
import edgeyData from './geojson/mingwei_topics/im_edges.geojson';
import nodeData from './geojson/mingwei_topics/im_nodes.geojson';






// d3.json(nodeData).then(data=>{
//   let canvas = document.createElement('canvas');
//   let ctx = canvas.getContext('2d');
//   ctx.textAlign = 'center';
//   ctx.textBaseline = 'middle';
//   //compute bbox
//   data.features.forEach((d,i)=>{
//     d.index = i;
//     let p = d.properties;
//     let [x,y] = d.geometry.coordinates;
//     ctx.font = `${sl(+p.level)}px ${FONT}`;
//     let m = ctx.measureText(p.label);
//     let width = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
//     let height = m.actualBoundingBoxDescent + m.actualBoundingBoxAscent;
//     p.bbox = {
//       x, y, width, height
//     };
//   });
//   utils.markNonOverlapResolution(data.features);
//   console.log(data.features);
// });





let clusterStyleFunction = function(feature, resolution) {
  let clusterStyle = new Style({
    stroke: new Stroke({
      color: feature.get("stroke"),
      width: 1
    }),
    fill: new Fill({
      color: feature.get("fill")
    })
  });
  return clusterStyle;
};


let clusterBoundaryStyleFunction = function(feature, resolution) {
  let clusterStyle = new Style({
    stroke: new Stroke({
      color: feature.get("stroke"),  
      width: 0
    }),
    fill: new Fill({
      color: feature.get("fill")
    })
  });
  return clusterStyle;
};


let edgeStyleFunction = function(feature, resolution) {
  let l = feature.get('level');
  let c = feature.get("stroke");
  let edgeStyle = new Style({
    stroke: new Stroke({
      color: '#aaa',//c,
      width: 0.3*(10-l),
    })
  });
  return edgeStyle;
};



let nodeStyleFunction = function(feature, resolution) {
  if (getVisible(feature, resolution)){
    return new Style({
      stroke: new Stroke({  
        color: 'rgba(0,0,0,0.5)',  
        width: 1  
      }),
      fill: new Fill({
        color: 'rgba(255,255,255,0.5)'
      }),
      text: createTextStyle(
        feature.get("label"), 
        feature.get("fontsize"), 
        feature.get("level"), 
        feature.get("height"),
        feature.get("weight"),
        resolution
      )
    });
  }else{
    return new Style({
      // image: new CircleStyle({
      //   fill: new Fill({
      //     color: '#aaa'
      //   }),
      //   // stroke: new Stroke({
      //   //   color: '#3399CC',
      //   //   width: 0
      //   // }),
      //   radius: 1
      // }),
    });
  }
};


let selectStyleFunction=function(feature, resolution) {
  let nodestyle = new Style({
    stroke: new Stroke({
      color: 'rgba(0,0,0,0.5)',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(255,255,255,0.5)'
    })
  });
};



let selectStyleFunctionForNode=function(feature, resolution) {
  let style = nodeStyleFunction(feature, resolution);
  if (style.getFill()){
    style.setFill( new Fill({
      color: 'rgba(255,255,255,1)'
    }));
    style.setStroke( new Stroke({
      color: 'rgba(255,0,0,0.5)',
      width: 2
    }))
  }
  return style;
};


let selectStyleFunctionForEdge=function(feature, resolution) {
  let style=edgeStyleFunction(feature, resolution);
 let stk=  style.getStroke()
 if (stk){
 stk.width_ = stk.width_ + 2
 stk.color_="red"
 style.setStroke(stk);
 }
 //console.log(stk)
  return style;
};




let getVisible = function(feature,resolution){
  return feature.get('resolution') >= resolution;
};


let createTextStyle = function(label, fontsize, level, boxheight, weight, resolution) {
  // let remap = 2 + (8-level)*1.5/7;
  // let fsize =  5 * remap;
  let fsize = sl(level);

  let nodetext = new Text({
    font: fsize + 'px arial',  
    text: label,
    fill: new Fill({
      color: 'rgba(72,79,90,1)'
    }),
    stroke: new Stroke({
      color: 'rgba(250,250,250,1)',
      width: 2
    }),
    offsetX: 0,
    offsetY: 0,//boxheight/2,
  });
  return nodetext;
};



const FONT = 'arial';
const minResolution = 4;
const maxResolution = 305;

let sl = d3.scaleLinear().domain([1,8]).range([20,12]);

let clusterSource = new Vector({  url: clusterData,  format: new GeoJSON() });
let clusterLayer = new VectorLayer({  source: clusterSource,  style: clusterStyleFunction });

let clusterBoundaySource = new Vector({ url: clusterBoundaryData, format: new GeoJSON() });
let clusterBoundayLayer = new VectorLayer({   source: clusterBoundaySource,   style: clusterBoundaryStyleFunction });

let edgeSource = new Vector({  url: edgeyData,  format: new GeoJSON() });
let edgesLayer = new VectorLayer({  source: edgeSource,  style: edgeStyleFunction});

// let nodeSource = new Vector({  url: nodeData,  format: new GeoJSON()});
let nodeSource = new Vector({
  format: new GeoJSON(),
  loader: function(extent, resolution, projection, callee){
    var url = nodeData;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onerror = function() {
      nodeSource.removeLoadedExtent(extent);
    };
    xhr.onload = function() {
      if (xhr.status == 200) {
        let features = nodeSource.getFormat().readFeatures(xhr.responseText);
        utils.markBoundingBox(features, sl, FONT);
        utils.markNonOverlapResolution(features, undefined, minResolution, maxResolution);
        nodeSource.addFeatures(features);
        console.log(features);
      } else {
        onError();
      }
    };
    xhr.send();
  }
});
let nodesLayer = new VectorLayer({  source: nodeSource,  style: nodeStyleFunction});

//let geolayer = new TileLayer({  source: new OSM()});
// ClusterLayer,clusterBoundayLayer,
let map = new Map({
  controls: defaultControls().extend([new OverviewMap()]),
  layers: [clusterLayer, clusterBoundayLayer, edgesLayer, nodesLayer],
  target: 'map',
  view: new View({
    center: [0, 0],
    // minResolution,
    // maxResolution,
    zoom: 11,
    maxZoom: 15,
    minZoom: 9,
  })
});

global.map = map;
console.log(map.getView().minResolution_, map.getView().maxResolution_);
let popup = new Overlay({
  element: document.getElementById('popup')
});
map.addOverlay(popup);

global.popup = popup


let edgeSelectPointerMove = new Select({
  condition: pointerMove,
  layers: [edgesLayer],
  style:selectStyleFunctionForEdge
});


let nodeSelectPointerMove = new Select({
  condition: pointerMove,
  layers: [nodesLayer],
  style: selectStyleFunctionForNode
});

map.addInteraction(edgeSelectPointerMove);
map.addInteraction(nodeSelectPointerMove);

map.on('click', function(evt) {
  let element = popup.getElement();
  $(element).popover('destroy');
  let feature = map.forEachFeatureAtPixel(evt.pixel,
      function(feature, layer) {      return feature;  });
      if (feature) {
          let element = popup.getElement();
        let geometry = feature.getGeometry();
        let fid=feature.getId()
        let ftype = feature.getGeometry().getType()
        if ( fid &&  fid.search("cluster")>-1 ) return 0;

        $(element)[0].title = feature.get('label')
       let content =     feature.get('label') + " <br> Weight: " +  feature.get('weight') +"<br> Level: " + feature.get('level')  ;

        $(element).popover('destroy');
        popup.setPosition(evt.coordinate);
        $(element).popover({ placement: 'top',  animation: false,  html: true,  content: content,    });
        $(element).popover('show');
  }
});