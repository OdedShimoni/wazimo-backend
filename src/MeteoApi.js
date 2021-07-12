const axios = require('axios');
const node_xml_stream = require('node-xml-stream');

class MeteoApi {
    maxTd = 30;
    maxRh = 50;
    maxWs = 30;

    getAlarmingAreas() {
        const api = this;
        return new Promise((resolve, reject) => {
            const meteo = new Map;
            const parser = new node_xml_stream;

            let stnName, td, rh, ws;
            
            axios({
                method: 'get',
                url: 'https://ims.data.gov.il/sites/default/files/xml/imslasthour.xml',
                responseType: 'stream'
            })
            .then(res => {
                res.data
                    .pipe(parser)
            })
            .catch(console.log) // error logging logic

            // callback contains the name of the node and any attributes associated
            parser.on('opentag', function(name, attrs) {
                if(name === 'TD') {
                    this.currentAttr = attrs;
                }
                this.currentTagName = name;
            });
    
            // callback contains the name of the node.
            parser.on('closetag', function(name) {
                if (name !== 'Observation') {
                    return;
                }

                if (
                    api.maxTd < Number(td) ||
                    api.maxRh < Number(rh) ||
                    api.maxWs < Number(ws)
                ) {
                    meteo.set(stnName, {
                        td,
                        rh,
                        ws
                    });
                }
            });
    
            // callback contains the text within the node.
            parser.on('text', function(text) {
                const { currentTagName } = this;
                if(currentTagName === 'stn_name') {
                    stnName = text;
                }
    
                if(currentTagName === 'TD') {
                    td = text;
                }
    
                if(currentTagName === 'RH') {
                    rh = text;
                }
    
                if(currentTagName === 'WS') {
                    ws = text;
                }
            });
    
            // callback to do something after stream has finished
            parser.on('finish', function() {
                resolve(meteo);
            });

        })
    }
}

MeteoApi.prototype.parser = new node_xml_stream();

module.exports = MeteoApi;