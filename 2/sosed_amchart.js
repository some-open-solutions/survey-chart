var categoryAxis;
var chart;
var chart_data;
var series;
var valueAxis;
function sosed_amchart(map_div_id,
                       sheet_id,
                       table_id,
                       this_type,
                       subsheet_number,
                       column_number){
  var current_data;
  var ParseGSX = (function() {

    var _defaultCallback = function(data) {
      console.log(data);
    };

    var _parseRawData = function(res) {
      var finalData = [];
      res.feed.entry.forEach(function(entry){
        var parsedObject = {};
        for (var key in entry) {
          if (key.substring(0,4) === "gsx$") {
            parsedObject[key.slice(4)] = entry[key]["$t"];
          }
        }
        finalData.push(parsedObject);
      });
      var processGSXData = _defaultCallback;
      processGSXData(finalData);
    };

    var parseGSX = function(spreadsheetID, callback) {
      var url = "https://spreadsheets.google.com/feeds/list/" + 
                spreadsheetID + "/" + subsheet_number + 
                "/public/values?alt=json";
      var ajax = $.ajax(url);
      if (callback) { _defaultCallback = callback; }
      $.when(ajax).then(_parseRawData);
    };

    return { parseGSX: parseGSX };

  })();  
  var continents;
  function update_chart(){
    ParseGSX.parseGSX(sheet_id,function(data){
      $("#waiting_div").fadeOut(function(){
        $("#content_div").fadeIn();
      });
      
      switch(this_type){
        case "frequency":
          if(column_number == "multi"){
            chart_obj.all_cols = data[0].columns.split("|");
            chart_obj.current_col = chart_obj.all_cols[0];
            column_number = chart_obj.current_col;
            
          } 
          var freq_obj = {};
          var item = Object.keys(data[0])[column_number];
          
          
          $("#title_h1").html(data[0][item]);
          
          
          freq_obj[item] = {
            text: data[0][item],
            freq: {}
          };
          
          am4core.useTheme(am4themes_animated);
          chart = am4core.create(map_div_id, am4charts.XYChart);
          chart.data = [];
          for(var i = 1; i < data.length; i++){
            if(typeof(freq_obj[item].freq[data[i][item]]) == "undefined"){
              freq_obj[item].freq[data[i][item]] = 0;
            }
            freq_obj[item].freq[data[i][item]]++;
          }
          
          Object.keys(freq_obj[item].freq).forEach(function(sub_item){
            chart.data.push({
              "category"  : sub_item,
              "frequency" : freq_obj[item].freq[sub_item],
              "color"     : "am4core.color('red');"
            });
          });
          
          /*
          * build plot here 
          */
          
          chart.bottomAxesContainer.layout = "horizontal";
          chart.bottomAxesContainer.reverseOrder = true;

          categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
          categoryAxis.dataFields.category = "category";
          categoryAxis.renderer.grid.template.strokeOpacity = 1;
          categoryAxis.renderer.grid.template.location = 1;
          categoryAxis.renderer.minGridDistance = 20;
          categoryAxis.fontFamily = "Helvetica";
          categoryAxis.fontSize = 20;
          
          
          categoryAxis.renderer.labels.template.fill = am4core.color("#069");
          
          //categoryAxis.color = "green";
          
          valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
          valueAxis.tooltip.disabled = false;
          valueAxis.renderer.baseGrid.disabled = true;
          valueAxis.marginRight = 30;
          valueAxis.renderer.gridContainer.background.fillOpacity = 0.05;
          valueAxis.renderer.grid.template.strokeOpacity = 1;
          valueAxis.title.text = "Votes";
          valueAxis.fontSize = 20;
          valueAxis.fontFamily = "Helvetica";
          valueAxis.maxPrecision = 0;
          
          valueAxis.renderer.labels.template.fill = am4core.color("#069");

          series = chart.series.push(new am4charts.ColumnSeries());
          series.dataFields.categoryY = "category";
          series.dataFields.valueX = "frequency";
          series.dataFields.fill = "color";
          
          series.columns.template.adapter.add("fill", function (fill, target) {
            if(typeof(data[0].correct) == "undefined"){
              return chart.colors.getIndex(target.dataItem.index);
            } else {
              
              var this_index = chart_obj.all_cols.indexOf(chart_obj.current_col);
              var this_correct_answer = data[0].correct.split("|")[this_index];
              
              if(this_correct_answer == target.dataItem.categories.categoryY){
                return am4core.color('#5cb85c');
              } else {
                return am4core.color('#d9534f');
              }
            }
          });
        
          
          break;
        case "map":
          if(JSON.stringify(data) !== JSON.stringify(current_data)){
          
            var table_content = "<table class='table'>" +
                                  "<thead>" +
                                    "<tr>" +
                                      "<th scope='col'>Country</th>" +
                                      "<th scope='col'>Number of people</th>" +
                                    "</tr>" +
                                  "</thead>" +
                                  "<tbody>";
            current_data = JSON.parse(JSON.stringify(data));
            am4core.ready(function() {

            // Themes begin
            am4core.useTheme(am4themes_animated);
            // Themes end

            continents = {
              "AF": 2,
              "AN": 2,
              "AS": 2,
              "EU": 2,
              "NA": 2,
              "OC": 2,
              "SA": 2
            }

            // Create map instance
            chart = am4core.create(map_div_id, am4maps.MapChart);
            chart.projection = new am4maps.projections.Miller();

            // Create map polygon series for world map
            worldSeries = chart.series.push(new am4maps.MapPolygonSeries());
            worldSeries.useGeodata = true;
            worldSeries.geodata = am4geodata_worldLow;
            worldSeries.exclude = ["AQ"];

            var worldPolygon = worldSeries.mapPolygons.template;
            worldPolygon.tooltipText = "{name}";
            worldPolygon.nonScalingStroke = true;
            worldPolygon.strokeOpacity = 0.5;
            worldPolygon.fill = am4core.color("#eee");
            worldPolygon.propertyFields.fill = "color";

            var hs = worldPolygon.states.create("hover");
            hs.properties.fill = chart.colors.getIndex(9);


            // Create country specific series (but hide it for now)
            var countrySeries = chart.series.push(new am4maps.MapPolygonSeries());
            countrySeries.useGeodata = true;
            countrySeries.hide();
            countrySeries.geodataSource.events.on("done", function(ev) {
              worldSeries.hide();
              countrySeries.show();
            });

            var countryPolygon = countrySeries.mapPolygons.template;
            countryPolygon.tooltipText = "{name}";
            countryPolygon.nonScalingStroke = true;
            countryPolygon.strokeOpacity = 0.5;
            countryPolygon.fill = am4core.color("#eee");

            var hs = countryPolygon.states.create("hover");
            hs.properties.fill = chart.colors.getIndex(9);

            // Set up click events
            worldPolygon.events.on("hit", function(ev) {
              ev.target.series.chart.zoomToMapObject(ev.target);
              var map = ev.target.dataItem.dataContext.map;
              if (map) {
                ev.target.isHover = false;
                countrySeries.geodataSource.url = "https://www.amcharts.com/lib/4/geodata/json/" + map + ".json";
                countrySeries.geodataSource.load();
              }
            });
            
            
            var row_order = Object.keys(data);


            row_order.sort(function(a,b) {
              return data[a].frequency - data[b].frequency;
            });
            
            data_sorted = [];
            for(var i = 0; i < data.length; i++){
              data_sorted[i] = data[row_order[i]];
            }
            data_sorted = data_sorted.reverse();
            
            data_sorted.forEach(function(row){
              if(row.frequency !== "" && parseFloat(row.frequency) !== 0){
                table_content +=  "<tr>"+
                                    "<td>" + row.country + "</td>" +
                                    "<td>" + row.frequency + "</td>" +
                                  "</tr>";					
              }
            });
            
            
            data = data.map(function(row){
              
              row.id = row.code;
              
              var country = am4geodata_data_countries2[row.id];
              
              if(row.frequency > 0){
                row.color = chart.colors.getIndex(continents[country.continent_code]);
                
              }
              
              //row.map = country.maps[0];
              
              
              
              
              return row;
            });
            
            table_content += "</tbody>"  + "</table>";
            $("#" + table_id).html(table_content);
            
            worldSeries.data = data;

            // Zoom control
            chart.zoomControl = new am4maps.ZoomControl();

            var homeButton = new am4core.Button();
            homeButton.events.on("hit", function() {
              worldSeries.show();
              countrySeries.hide();
              chart.goHome();
            });

            homeButton.icon = new am4core.Sprite();
            homeButton.padding(7, 5, 7, 5);
            homeButton.width = 30;
            homeButton.icon.path = "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8";
            homeButton.marginBottom = 10;
            homeButton.parent = chart.zoomControl;
            homeButton.insertBefore(chart.zoomControl.plusButton);

            });
          }
        
        break;
      }
    });
  }
  update_chart();
  
  update_interval = setInterval(function(){
    var this_gets = get_gets();
    switch(this_gets.type){
      case "frequency":
        ParseGSX.parseGSX(sheet_id,function(data){
          var freq_obj = {};
          var item = Object.keys(data[0])[chart_obj.current_col];
          freq_obj[item] = {
            text: data[0][item],
            freq: {}
          };
          
          chart_data = [];
          
          for(var i = 1; i < data.length; i++){
            if(typeof(freq_obj[item].freq[data[i][item]]) == "undefined"){
              freq_obj[item].freq[data[i][item]] = 0;
            }
            freq_obj[item].freq[data[i][item]]++;
          }
          
          Object.keys(freq_obj[item].freq).forEach(function(sub_item){
            chart_data.push({
              "category"  : sub_item,
              "frequency" : freq_obj[item].freq[sub_item]
            });
          });
          
          ////
          // list of categories
          ////
          var categories = chart_data.map(a => a.category);          
          
          categories.forEach(function(this_category){
            var this_row = chart.data.filter(row => row.category == this_category);
            if(this_row.length == 0){
              chart.addData({
                category: this_category,
                frequency: 1
              });
            }
          });
          
          var chart_categories = chart.data.map(a => a.category);
          
          chart_categories.forEach(function(this_category,index){
            var this_row = chart_data.filter(row => row.category == this_category)[0];
            if(typeof(this_row) == "undefined"){
              chart.data[index].frequency = 0;
            } else {
              chart.data[index].frequency = this_row.frequency;
            }
          });
          
          chart.invalidateRawData();
          
        });
        
        
        break;
      case "map":
        ParseGSX.parseGSX(sheet_id,function(data){
          
          if(JSON.stringify(data) !== JSON.stringify(current_data)){
            
            current_data = JSON.parse(JSON.stringify(data));
            var table_content = "<table class='table'>" +
                                  "<thead>" +
                                    "<tr>" +
                                      "<th scope='col'>Country</th>" +
                                      "<th scope='col'>Number of people</th>" +
                                    "</tr>" +
                                  "</thead>" +
                                  "<tbody>";
            
            worldSeries.data = data.map(function(row){
              
              row.id = row.code;
              
              var country = am4geodata_data_countries2[row.id];
              
              if(row.frequency > 0){
                row.color = chart.colors.getIndex(continents[country.continent_code]);
                
              }
              
              //row.map = country.maps[0];
              
              return row;
            });
            var row_order = Object.keys(data);


            row_order.sort(function(a,b) {
              return data[a].frequency - data[b].frequency;
            });
            
            data_sorted = [];
            for(var i = 0; i < data.length; i++){
              data_sorted[i] = data[row_order[i]];
            }
            data_sorted = data_sorted.reverse();
            
            data_sorted.forEach(function(row){
              if(row.frequency !== "" && parseFloat(row.frequency) !== 0){
                table_content +=  "<tr>"+
                                    "<td>" + row.country + "</td>" +
                                    "<td>" + row.frequency + "</td>" +
                                  "</tr>";					
              }
            });
            
            
            table_content += "</tbody>"  + "</table>";
            $("#" + table_id).html(table_content);
            
          }
        });
        break;
    }
  },5000); 
}