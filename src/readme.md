*To register a new node:* 
1. Add its key and typings defination in typings.ts
2. In nodeHandlerService add a new entry in nodes Map

*Componets*
GetNextNode
    - recive the response of current node and based on that descide the edge and return next node
    - (optional) set meta of current node for next nodes

SendNode
    this will send the node to user and mark this node as current node. Also it set some other fields like current_level, max_level, clear level_score, etc


*Flow*
current_node => A

call A`s getNextNode, which set meta of A and gives B node
call B`s sendNode, which will send B to user and mark B as current node
check pauseAfterExecution of B, if true stop. Else, 

current_node => B

call B`s getNextNode, which set meta of B and gives C node
call C`s sendNode, which will send C to user and mark C as current node
check pauseAfterExecution of B, if true stop. Else, 