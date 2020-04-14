import React from "react";
import * as d3 from 'd3';
import { tsv } from 'd3-fetch';
import './DynamicGrid.css';
import { Col, Row } from 'react-flexbox-grid';


class DeviceGraphAndGrid extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      dataSortedByDevice: {},
      dateMonthDay: new Date().toLocaleString('default', {
        month: 'long',
        day: "2-digit",
        year: "numeric"
      })
    }


    this.FetchDataTSV = this.FetchDataTSV.bind(this);
    this.ProcessRawDataTSV = this.ProcessRawDataTSV.bind(this);
    this.SortDataByDevice = this.SortDataByDevice.bind(this);
    this.ConvertToTime24HR = this.ConvertToTime24HR.bind(this);
    this.GetRandomColor = this.GetRandomColor.bind(this);
    this.InitLineChart = this.InitLineChart.bind(this);
    this.DrawLine = this.DrawLine.bind(this);

  }



  async componentDidMount() {

    // Fetch Data TSV
    let dataRawTSV = await this.FetchDataTSV();

    // Process Raw Data (convert String to Date, Number)
    let dataAll = this.ProcessRawDataTSV(dataRawTSV) || [{ timestamp: new Date() }];
    let dateMonthDay = (new Date(dataAll[0]["timestamp"]) || new Date()).toLocaleString('default', {
      month: 'long',
      day: "2-digit",
      year: "numeric"
    });


    // Sort Data By Device
    let dataSortedByDevice = this.SortDataByDevice(dataAll);
    // console.log("dataDevices: ", dataDevices);

    // set state
    await this.setState({
      dataSortedByDevice: dataSortedByDevice || {},
      dateMonthDay: dateMonthDay
    });

    // Init Line Chart
    let chart = this.InitLineChart(dataAll);

    // Draw lines on chart
    for (var deviceId in dataSortedByDevice) {
      // un-pack
      let dataDevice = dataSortedByDevice[deviceId];
     // console.log(deviceId, dataDevice, "\n\n");

      // Draw line on chart
      this.DrawLine(dataDevice, chart);
    }

  } // end componentDidMount


  // #region api calls
  async FetchDataTSV() {
    const url = 'https://raw.githubusercontent.com/hologram-io/carthage/master/usage.tsv';

    let rawDataTSVFinal = [];
    await tsv(url).then(rawDataTSV => {

      /*    console.log(data); */
      if (rawDataTSV === null || rawDataTSV.length === 0) {
        console.log("problem fetching data, data was empty");
      }

      rawDataTSVFinal = rawDataTSV;
    });

    return rawDataTSVFinal || [];
  }
  // #endregion


  // #region data process
  ProcessRawDataTSV(rawDataTSV) {

    // process data- cast as Number, ConvertToTime24HR
    var dataProcessed = rawDataTSV.map((item, index) => {
      item.deviceid = Number(item.deviceid);
      item.usage = Number(item.usage);
      item.x = Number(item.x);
      item.y = Number(item.y);
      item.timestamp = this.ConvertToTime24HR(item.timestamp);

      return item;
    });
    return dataProcessed;
  }


  SortDataByDevice(dataProcessed) {

    // sort by deviceId
    // builds object literal like this: { deviceId: [{},{},{},{}]}
    let dataByDeviceId = {};
    dataProcessed.forEach((item, index) => {
      let deviceId = item["deviceid"];
      let colorCodeHex = "";

      if (!(deviceId in dataByDeviceId)) {
        dataByDeviceId[deviceId] = [];
        colorCodeHex = this.GetRandomColor();
      }
      item["colorCodeHex"] = colorCodeHex; // init color code for device
      dataByDeviceId[deviceId].push(item);
    });

    // remove outlier
    delete dataByDeviceId["5537"];

    // for each device, sort by datetime ascending
    for (var key in dataByDeviceId) {

      // sort by datetime ascending
      dataByDeviceId[key].sort((a, b) => {
        var key1 = Date(a.timestamp);
        var key2 = Date(b.timestamp);

        if (key1 < key2) {
          return -1;
        } else if (key1 === key2) {
          return 0;
        } else {
          return 1;
        }
      });

    }

    return dataByDeviceId;
  }
  // #endregion


  // #region helper methods
  ConvertToTime24HR(time12h) {
    const time = time12h.replace("AM", "").replace("PM", "");
    const modifier = time12h.includes("AM") ? "AM" : time12h.includes("PM") ? "PM" : "";

    let [hours, minutes] = time.split(':');

    if (hours === '12') {
      hours = '00';
    }

    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }

    var dateTimeNow = new Date();
    var year = dateTimeNow.getFullYear();
    var month = dateTimeNow.getUTCMonth();
    var day = dateTimeNow.getUTCDay();


    var fullDate = new Date(year, month, day, hours, minutes);
    var timeOnly = fullDate.getTime();

    return timeOnly;
  }

  GetRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }



  // #endregion


  // #region chart
  InitLineChart(allData) {

    var vis = d3.select('#svgLineChart'),
      WIDTH = 1200,
      HEIGHT = 660,
      MARGINS = {
        top: 50,
        right: 50,
        bottom: 50,
        left: 100
      },

      mindate = d3.min(allData, function (d) {
        return d.timestamp;
      }),
      maxdate = d3.max(allData, function (d) {
        return d.timestamp;
      }),

      xRange = d3.scaleTime()
        .domain([mindate, maxdate])
        .range([MARGINS.left, WIDTH - MARGINS.right]),

      yRange = d3.scaleLinear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([d3.min(allData, function (d) {
        return d.usage < 200 ? d.usage : 0;
      }), d3.max(allData, function (d) {
        return d.usage < 200 ? d.usage : 0;
      })]),

      xAxis = d3.axisBottom(xRange)
        .tickSize(5),
      yAxis = d3.axisLeft(yRange)
        .tickSize(5);

    // append x-axis
    vis.append('svg:g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + (HEIGHT - MARGINS.bottom) + ')')
      .call(xAxis);

    // append y-axis
    vis.append('svg:g')
      .attr('class', 'y axis')
      .attr('transform', 'translate(' + (MARGINS.left) + ',0)')
      .call(yAxis);

    // text label for the x axis
    vis.append("text")
      .attr("transform",
      "translate(" + (WIDTH / 2) + " ," +
      HEIGHT + ")")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "18px")
      .text("Date & Time");

    // text label for the y axis
    vis.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - MARGINS.left)
      .attr("x", 0 - (HEIGHT / 2))
      .attr("dy", "9em")
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "18px")
      .text("Device Usage");

    let chart = {
      vis: vis,
      xRange: xRange,
      yRange: yRange
    };

    return chart;
  }




  DrawLine(lineData, chart) {
    // un-pack
    let vis = chart["vis"];
    let xRange = chart["xRange"];
    let yRange = chart["yRange"];
    let colorHex = lineData !== null && lineData.length > 0 ? lineData[0]["colorCodeHex"] : "";


    var lineFunc = d3.line()
      .x(function (d) {
        return xRange(d.timestamp);
      })
      .y(function (d) {
        return yRange(d.usage);
      })
      .curve(d3.curveLinear);

    vis.append('svg:path')
      .attr('d', lineFunc(lineData))
      .attr('stroke', colorHex)
      .attr('stroke-width', 6)
      .attr('fill', 'none');
  }

  // #endregion


  render() {

    const columnWidth = 3;

    return (
      <div>
        <div className="divGraphHolder">
          <div className="headerChartGrid">Device Usage for {this.state.dateMonthDay}</div>
          <svg id="svgLineChart" width="1200" height="700" style={{ color: '#000000', margin: "0px auto" }}></svg>
          <div style={{ margin: "0px auto 0px auto", padding: "5px", textAlign: "center", minWidth: "60%" }}>
            <div className="subheaderChart">Legend</div>
            <div className="flexContainer_legend">
              {Object.keys(this.state.dataSortedByDevice).map((deviceId, index) => {
                let deviceData = this.state.dataSortedByDevice[deviceId];
                // validation
                if (deviceData === null || deviceData.length === 0 || deviceData.length === 1) {
                  return true; // continue
                }
                // un-pack
                let colorCodeHex = deviceData[0]["colorCodeHex"];
                return (     
                  <div className="flexItem_legend" key={index}>
                    <div className="divColorCodeSquare" style={{ backgroundColor: colorCodeHex }}></div>
                    <div>DeviceId: {deviceId}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>


        <div className="divGridHolder">
          <div className="headerChartGrid">Device Usage Grid for {this.state.dateMonthDay}</div>
          <Row className="grid-row rowGrid" >
            <Col className="grid columnGridHeader" sm={columnWidth} md={columnWidth}>
              Device ID
              </Col>
            <Col className="grid columnGridHeader" sm={columnWidth} md={columnWidth}>
              Peak Usage
            </Col>

            <Col className="grid columnGridHeader" sm={columnWidth} md={columnWidth}>
              Total Usage
            </Col>

            <Col className="grid columnGridHeader" sm={columnWidth} md={columnWidth}>
              Color Code
              </Col>
          </Row>
          {Object.keys(this.state.dataSortedByDevice).map((deviceId, index) => {
            let deviceData = this.state.dataSortedByDevice[deviceId];
            // validation
            if (deviceData === null || deviceData.length === 0 || deviceData.length === 1) {
              return true; // continue
            }

            // un-pack
            let colorCodeHex = deviceData[0]["colorCodeHex"];
            let totalUsage = 0;
            deviceData.forEach((device, index) => {
              totalUsage += device["usage"];
            });

            // clone array
            var deviceDataNew = deviceData.slice();
            // sort by usage
            deviceDataNew.sort((a, b) => {
              return b.usage - a.usage;
            });
            let maxUsage = deviceDataNew[0]["usage"];
            let maxUsageTime = deviceDataNew[0]["timestamp"];
            let maxUsageTimeFormat = new Date(maxUsageTime).toLocaleString('default', {
              hour: '2-digit',
              minute: "2-digit"
            })
            return (
              <Row className="grid-row rowGrid" key={index}>
                <Col className="grid columnGrid" sm={columnWidth} md={columnWidth}>
                  {deviceId}
                </Col>
                <Col className="grid columnGrid" sm={columnWidth} md={columnWidth}>
                  {maxUsage} at {maxUsageTimeFormat}
                </Col>
                <Col className="grid columnGrid" sm={columnWidth} md={columnWidth}>
                  {totalUsage}
                </Col>
                <Col className="grid columnGrid" sm={columnWidth} md={columnWidth}>

                  <div className="divColorCodeSquare" style={{ backgroundColor: colorCodeHex }}></div>

                </Col>
              </Row>
            )
          })}

        </div>
      </div>
    );
  }

}

export default DeviceGraphAndGrid;