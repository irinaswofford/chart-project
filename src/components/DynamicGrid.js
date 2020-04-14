import { chunk } from 'lodash';
import * as React from 'react';
import { Col, Row , DeviceGraphAndGrid} from 'react-flexbox-grid';
import './DynamicGrid.css'; 

const  DynamicGrid  = ({ cols, children }) => {
const colWidth = 12 / cols 
const rows = chunk(React.Children.toArray(children), cols)


return (
    <DeviceGraphAndGrid >
      {rows.map((cols) => (

        <Row className="grid-row" >
          {cols.map((col) => (
            <Col className="grid" sm={colWidth} md={colWidth}>
              {col}
            </Col>
          ))}
        </Row>
      ))}
    </DeviceGraphAndGrid>
  )
}
export default DynamicGrid