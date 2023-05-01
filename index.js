const createGraph = (options = {}) => {
  const initialMetadata = { 
    title: options.title || "Graph " ,
    hasLoops: options.hasLoops || false,
    hasEdgeWeights: options.hasLoops || false,
    hasDirectedEdges: options.hasDirectedEdges || false,
    isSimple: options.isSimple || true
  }
  const initialOptions = {
    defaultNewEdgeLabel: options.defaultNewEdgeLabel || "" ,
    defaultNewVertexLabel:options.defaultNewVertexLabel || "", 
    defaultNewVertexWeight:options.defaultNewVertexWeight || "", 
    defaultNewEdgeWeight:options.defaultNewEdgeWeight || "",
    addBlankVertex: options.addBlankVertex|| true 
  }
  const theGraph = {
    vertices: {},
    edges: [],
    metadata: initialMetadata,
    options: initialOptions
  }
  return theGraph
} 


const addVertex = (graphData,options) =>{
  if(!options.id){
    if(!graphData.options.addBlankVertex){
      throw new Error ("No vertex id provided")
    }else{
      options.id = Math.floor(Math.random() * (50000) +1)
    }
  }
  if(graphData.vertices[options.id]){
    throw new Error("Vertex with same id already exists in the graph.")
  }
  graphData.vertices[options.id] = {
    label: options.label || options.id ,
    weight: 'weight' in options ? options.weight : graphData.options.defaultNewVertexWeight,
    data: options.data,
    temp: {...options.temp}
  }
  return graphData
  
}


const addEdge = (graphData,options)=>{

  if(!options.v1){throw new Error("Vertex 1 not provided")}
  if(!options.v2){throw new Error("Vertex 2 not provided")}
  
  if(!graphData.vertices[options.v1]){throw new Error(`Vertex 1 (${options.v1}) does not exists in the graph`)}
  if(!graphData.vertices[options.v2]){throw new Error(`Vertex 2 (${options.v2})  does not exists in the graph`)}

  const node1node2Search = graphData.edges.find(edge=>{return edge.v1 == options.v1 &&  edge.v2 == options.v2})
  const node2node1Search = graphData.edges.find(edge=>{return edge.v1 == options.v2 &&  edge.v2 == options.v1}) 

  if(graphData.metadata.isSimple){
    if(node1node2Search || node2node1Search ){ throw new Error(`Edge ${options.v1}--${options.v2} already exists in the simple graph`)}
  }

  let newEdge = {
    v1: options.v1,
    v2: options.v2, 
    weight:options.weight|| graphData.options.defaultNewEdgeWeight,
    label:options.label || graphData.options.defaultNewEdgeLabel,
    temp: {...options.temp}
  }

  graphData.edges.push(newEdge)

  return graphData

}


const getVertexNeighbours = (graphData,vertexId)=>{
  if(!vertexId){throw new Error("No Vertex Id not provided")}
  if(!graphData.vertices[vertexId]){throw new Error("Vertex not found in the graph")}

  const node1Search = graphData.edges.filter(edge=>edge.v1 == vertexId)
  const node2Search = graphData.edges.filter(edge=>edge.v2 == vertexId) 

  let neighbours = { in:[], out:[], all:[]}

  node1Search.map(edge2=>{ 
    if(neighbours.all.indexOf(edge2.v2)==-1){   
      neighbours.all.push(edge2.v2)
      neighbours.out.push(edge2.v2)
    }
  })
  node2Search.map(edge1=>{ 
    if(neighbours.all.indexOf(edge1.v1)==-1){   
      neighbours.all.push(edge1.v1)
      neighbours.in.push(edge1.v1)
    }
  })
  if(graphData.metadata.hasDirectedEdges){
      return neighbours.out
  }else{
      return neighbours.all
  }

}


const getVertexDegree = (graphData,vertexId)=>{
  const neighbours = getVertexNeighbours(graphData,vertexId)
  return  neighbours.length 
}


const getVertexKeyMap = (graphData,options={vertexProperties:[],initialObjectValue:{}})=>{
  let keyMap = {}
  const allKeys = Object.keys(graphData.vertices)
  vertexProps = {
    'degree':(vertexId)=>{
      return getVertexDegree(graphData,vertexId)
    }
  }
  allKeys.map(ky=>{
     keyMap[ky] =  {...options.initialObjectValue}
     options.vertexProperties.map(prop=>{
        keyMap[ky][prop] = vertexProps[prop](ky)
     })
  })
  return keyMap
}


const printEdges = (graphData)=>{
  graphData.edges.map(edge=>{
    console.log(` ${edge.v1}  ---  ${edge.v2} `)
  })
}


const fs = require("fs/promises");
const generateGraphPreview = async (graphs,options)=>{
  const saveSomethingInSomefile = async(fileContent,filePath) =>{
      await fs.writeFile(filePath, fileContent);
  }
  const generateHTMLBodyForGraphs = (inputGraphs) =>{
    let graphHtml = ""
    inputGraphs.map((graph,index)=>{
        let vertexInVisFormat = []
        const vertex = Object.keys(graph.vertices)
        vertex.map((v,inx)=>{
          let label = `${options.showVertexCreatedOrder?"("+inx+")     ":""}${graph['vertices'][v]['label']|| v}  `
          vertexInVisFormat.push( { id:v , label: label  } )
          })
        let edgesInVisFormat = []
        graph.edges.map(e=>{
          let newEdge = { from : e.v1, to: e.v2, color: e.temp['color']  }
          if(e.label){newEdge['label'] = e['label']}
          edgesInVisFormat.push(newEdge)
        })
        let visOptions = {
          "nodes":{"shape":"box"}
        }
        if(graph.metadata.hasDirectedEdges){visOptions['edges'] = { arrows: 'to'}}
        const dataForViz = {nodes : vertexInVisFormat,edges:  edgesInVisFormat,options: visOptions}
        graphHtml += `
            <h2> #${index+1}. ${graph.metadata.title}</h2>
            <div class="graph" id="graph${index}"></div>
            <details><summary>GraphData</summary><pre>${JSON.stringify(graph,null,2)}</pre></details>
            <script>
              let dataForViz${index} = ${JSON.stringify(dataForViz)}
              const container${index} = document.getElementById('graph${index}')
              const data${index} = {
                nodes: new vis.DataSet(dataForViz${index}.nodes),
                edges: new vis.DataSet(dataForViz${index}.edges)
              }
              let network${index} = new vis.Network(container${index}, data${index}, ${JSON.stringify(dataForViz['options'])});
            </script>`
      })
      return graphHtml
  }

  const formats = {
    'html':async ()=>{
      if(!options.outputPath){throw new Error("Path for output file not provided") }
      let graphHtml =  generateHTMLBodyForGraphs(graphs)
      const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><title>Graphs</title></head>
      <body><style>.graph {width: 90%; height: 80vh; border: 1px solid #80808036;}</style>${graphHtml}</body></html>`
      await saveSomethingInSomefile(htmlTemplate,options.outputPath)
      return {"message": "Saved"}
    },
    'htmlParts':async ()=>{
      let graphHtml =  generateHTMLBodyForGraphs(graphs)
      let htmlParts = {
        head:` <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>`,
        body: `<style>.graph {width: 90%; height: 80vh; border: 1px solid #80808036;}</style>${graphHtml}`
      }
      return htmlParts
    }
  }
  if(!options.format){throw new Error("Specify a format. Available foramts: "+Object.keys(formats))}
  try{
    const response = await formats[options.format]()
    return response
  }catch(error){console.log(error)}
}


const BreadthFirstSearch = (graphData,sourceVertexId)=>{
  if(!graphData.vertices[sourceVertexId]){throw new Error("Source vertex not found")}
  
  let graphCopy = JSON.parse(JSON.stringify(graphData))
  graphCopy.vertices[sourceVertexId].temp = {visited: true}

  let theTree = createGraph({title:`BFS tree starting with node ${sourceVertexId}`})
  theTree = addVertex(theTree,{id:sourceVertexId,weight:0})

  let queue = []
  queue.push(sourceVertexId)
  
  while(queue.length > 0){
      const aNode =  queue.shift()
      const sourceNeighbours = getVertexNeighbours(graphCopy,aNode)
      sourceNeighbours.map(neighbour=>{
        const alreadyVisited = 'visited'  in  graphCopy.vertices[neighbour]['temp']
        if(!alreadyVisited){
          queue.push(neighbour)
          predcessorWeight = theTree.vertices[aNode]['weight']
          theTree = addVertex(theTree,{id:neighbour,weight:predcessorWeight+1})
          theTree = addEdge(theTree,{v1:aNode,v2:neighbour})
          graphCopy.vertices[neighbour]['temp']['visited'] = true
        }
      })
  }
  return theTree
}


const DepthFirstSearch = (graphData)=>{
  let visited = getVertexKeyMap(graphData,{vertexProperties:["degree"], initialObjectValue :{color:'white', pi: null, d: 0, f:0}})
  //let allVertices = []
  //Object.keys(visited).map(itm=>{allVertices.push({vertex: itm,degree: visited[itm]['degree']})})
  //allVertices = allVertices.sort((a,b)=>{return b.degree - a.degree})
  let time = 0
  let otherEdges = []
  const DFS = () =>{
    Object.keys(graphData.vertices).map(vertex =>{
      if (visited[vertex]['color']=='white'){
        DFS_VISIT(vertex)
      }
    })
  }
  const DFS_VISIT = (u) =>{
    time = time +1 
    visited[u]['d'] = time
    visited[u]['color'] = 'grey'
    const neighbours = getVertexNeighbours(graphData,u) 
    neighbours.map(neighbour=>{
      if (visited[neighbour].color=='white'){
          visited[neighbour]['pi'] = u
          DFS_VISIT(neighbour)
        }else{
          let eType = visited[neighbour]['color']=="grey" ? "backward-edge":  "cross-edge"
          otherEdges.push({
            v1: u,
            v2: neighbour,
            label: eType ,
            temp: {color: eType=="backward-edge" ? "red" : "violet"  }
          })
        }
      })
      visited[u]['color'] = 'black'
      time = time + 1
      visited[u]['f'] = time 
  }
  DFS()
  let theDFSGraph = createGraph({title:`DFS Forest`, hasDirectedEdges: true})
  Object.keys(graphData.vertices).map(v=>{
    theDFSGraph = addVertex(theDFSGraph,
      {
        id:v, 
        label: `${v} (d=${visited[v]['d']},f=${visited[v]['f']})` ,
        temp: visited[v]
      })
  })
  Object.keys(visited).map(ver=>{ 
    if(visited[ver]['pi']){
      theDFSGraph = addEdge(theDFSGraph,{v1: visited[ver]['pi'] , v2: ver, label:"tree-edge", temp: {color:'green'}})
    }
  })
  otherEdges.map(edg=>{
      theDFSGraph = addEdge(theDFSGraph,edg)
  })
  return theDFSGraph
}


const CheckForCyclesInGraph = (graphData) => {
  const DFSTree = DepthFirstSearch(graphData)
  const backEdges = DFSTree.edges.filter(edge=>{return edge.label=='backward-edge'})
  return { cycleExists : backEdges.length > 0   , edges: backEdges, dfsTree : DFSTree }
}


const TopologicalSort = (graphData)=>{
  const cycleCheck = CheckForCyclesInGraph(graphData)
  if(cycleCheck.cycleExists){
    throw new Error("This graph has cycles. Topological sort not possible")
  }
  let tSortedGraph = createGraph({title:`Topological sorting`, hasDirectedEdges: true})
  tSortedGraph.vertices  =  JSON.parse(JSON.stringify(cycleCheck.dfsTree.vertices))
  let vertexOrder = []
  Object.keys(cycleCheck.dfsTree.vertices).map(v=>{
    vertexOrder.push({vertexId:v,fVal : cycleCheck.dfsTree.vertices[v]['temp']['f'] })
  })
  vertexOrder = vertexOrder.sort((a,b)=>{ return a.fVal - b.fVal })
  
  for(let i = 0; i <= vertexOrder.length - 2  ; i++ ){
    tSortedGraph = addEdge(tSortedGraph,{v1:vertexOrder[i]['vertexId'] , v2: vertexOrder[i+1]['vertexId'] })
  }
  return  { vertexInOrder : vertexOrder, dfsTree : cycleCheck.dfsTree  , tsTree: tSortedGraph  }
}


module.exports = {
  createGraph,
  addVertex,
  addEdge,
  getVertexNeighbours,
  getVertexDegree,
  getVertexKeyMap,
  printEdges,
  generateGraphPreview,
  BreadthFirstSearch,
  DepthFirstSearch,
  CheckForCyclesInGraph,
  TopologicalSort
}
