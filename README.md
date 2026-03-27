This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
项目成果URL：https://sulfur-agent-web.vercel.app	
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Here is the English translation of your document:

---

**I. Project Background**

Sulfur is a key raw material in phosphate fertilizer production, and its price fluctuations directly affect corporate procurement costs, inventory arrangements, and operational risks. The difficulty of procurement work lies not only in the price fluctuations themselves, but also in the chaotic sources of market information, rapid updates, and the sheer volume of data.

Within the global industrial landscape, sulfur spans core industrial chains such as fertilizers, chemicals, and pharmaceuticals, with price fluctuations impacting a trillion-dollar market. Traditional pricing relies on manual experience and fragmented information, resulting in delayed decision-making and difficult risk control; different enterprises facing the same market changes make different procurement choices. This pain point has yet to be effectively addressed.

Existing tools mostly remain at the level of price retrieval and information aggregation, lacking a decision support system that bridges market analysis with corporate judgment. To address this need, this project designs a price prediction and decision-making assistant for the sulfur procurement scenario. Starting from market information, the system identifies price trends and risk changes, then combines them with corporate inventory, supply-demand dynamics, and impact factor weights to generate differentiated recommendations. On the technical front, it utilizes a Hybrid ARIMA + XGBoost model for sulfur price analysis and prediction, along with an automatically updating knowledge graph to construct a comprehensive sulfur industry chain holographic map, connecting the four dimensions of supply, inventory, demand, and macroeconomics, achieving end-to-end intelligence from data to decision-making.

**II. Requirements Analysis**

**2.1 Market Trend Assessment**
Enterprises need to quickly understand the current state of the macro market, including whether prices are strong or weak, whether recent fluctuations warrant caution, and the main factors influencing market changes. The system should help enterprises extract clear trend judgments from fragmented information for price analysis, rather than merely listing news and data.

**2.2 Corporate Decision Support**
Enterprises want not only to know how the market is changing, but also whether those changes will affect their current procurement. The system needs to incorporate corporate inventory, demand scale, procurement volume, and risk tolerance to answer more business-specific questions such as whether procurement is advisable, how to pace procurement, and where the main risks lie.

**III. Intelligent Agent Architecture**

**3.1 Overall Architecture**
This project adopts a three-layer architecture consisting of the presentation layer, business layer, and data layer, completing market analysis, corporate modeling, and result output within a unified system. Overall, the system organizes the market-side information processing capabilities and the enterprise-side decision support capabilities into a complete intelligent agent architecture, allowing enterprise queries to be progressively processed along the path of "information acquisition, analysis and reasoning, result generation."

**3.2 Core Components**
To ensure the system possesses complete agent capabilities, the business layer is further divided into four core components.

**First, the Intent Recognition Module.** This module analyzes enterprise input, identifies query intentions such as price inquiry, trend analysis, procurement recommendations, etc., simultaneously extracts key entities like product, time, region, and enterprise, and determines whether the query is more oriented towards market analysis, enterprise analysis, or comprehensive judgment.

**Second, the Knowledge Retrieval Module.** *[Description omitted in original]*

**Third, the Reasoning Engine.** This module performs analytical reasoning based on large language models, and utilizes a Hybrid ARIMA + XGBoost model for sulfur price analysis and prediction, corporate impact factor weight calculation, dynamic self-learning and updating of the knowledge graph, and multi-dimensional risk assessment. It is responsible both for transforming market information into trend judgments and for converting corporate parameters into specific recommendations.

**Fourth, the Output Structure.** Through a dual-layer knowledge graph, the system places market changes and corporate states within the same relational structure, enabling further inference from market signals to corporate recommendations.

**IV. Technical Solution**

**4.1 Technical Architecture and Data Flow**
The technical solution of this project revolves around a complete data chain, covering five core links: data access, information organization, trend analysis, corporate modeling, and result generation. While retaining structured processing capabilities such as price prediction, knowledge graph, and corporate weights, the system integrates large language models to complete the final analytical integration and interactive output, forming a dual-engine decision system for the procurement scenario.

The frontend uses Next.js and React as the foundational framework, combined with Tailwind CSS for responsive interface design, Shadcn UI component library for unified interaction experience, and Recharts for visualizing price trends and knowledge graphs.

The backend is based on Node.js and Next.js API Routes for interface services, uses PostgreSQL with Drizzle ORM for data management and persistent storage, and incorporates Better Auth authentication mechanism for user identity verification and permission control.

The AI capabilities integrate the OpenAI SDK and AI SDK. DeepSeek-V3 is the primary model for text-based conversations, vision models support image analysis, and API aggregation is handled through qnaigc or OpenRouter. The price prediction component uses a Hybrid ARIMA + XGBoost model for sulfur price analysis and forecasting.

The system data flow begins with an enterprise query, which first enters the intent recognition stage to determine the query type (price inquiry, trend analysis, procurement recommendations, risk assessment, or report generation) and analysis dimension (market level, enterprise level, or comprehensive judgment). After recognition, the system synchronously obtains analytical bases from three sources: first, information crawling and external information access; second, internal data retrieval (prices, inventory, historical data); and third, baseline configurations and impact factor weights for three typical enterprise types. These three data streams collectively enter the dual-engine processing stage, and are finally integrated by the large language model to form a structured output structured as "Section One: Market Analysis, Section Two: Enterprise-Specific Recommendations."

**4.2 Core Modules**
The key modules of the system mainly include the Hybrid ARIMA + XGBoost model for sulfur price analysis and prediction, corporate impact factor weight calculation, dual-layer knowledge graph, report generation (five parts total).

The price prediction module primarily serves macro market trend identification. In the current design, the system uses a Hybrid ARIMA + XGBoost model for sulfur price analysis and prediction interfaces; future iterations may choose single models or multi-model fusion schemes based on actual performance. The focus here is not simply to provide a single predicted value, but to form a trend identification result usable for procurement decisions.

[Figure 4: Macro Industry Level Information]

The corporate impact factor weight calculation module establishes a model around three dimensions: supply-side factors, demand factors, and inventory information. Supply-side factors are relatively similar across the three enterprise types, while demand factors and inventory information show more pronounced differences. In the current example configuration, Enterprise A emphasizes demand factors more heavily, Enterprise B maintains a relatively balanced approach, and Enterprise C emphasizes inventory information more heavily. The total weights sum to 100% and can be dynamically adjusted based on enterprise size and industry position.

The dual-layer knowledge graph module organizes market information and enterprise information within the same relational structure. Changes at the market level are explained through the ontological framework, while differences at the enterprise level are constrained through instance data. Only by combining these can the system move from "what happened in the market" to "what this means for the current enterprise."

The report generation module supports templated report output. After completing a Q&A or scenario simulation, enterprises can automatically organize the analysis results into structured content, forming a two-section report containing market analysis and enterprise recommendations, with support for PDF or Word export. This allows system output to move beyond immediate answers and directly into procurement discussions, weekly meeting reports, and internal communication processes.

**4.3 Output and Interaction Forms**
At the interaction level, the system supports natural language questioning, enterprise selection, inventory parameter adjustment, knowledge graph viewing, and predictive chart display. Enterprises can either start by asking a question or directly switch between different enterprises, change their own conditions, and observe how the recommendations change accordingly. This interaction style serves both multi-scenario comparison in real business contexts and dynamic demonstration needs.

At the output level, the system adopts a two-section structure. The first section focuses on market-level analysis, presenting recent price trends, supply-demand judgments, risk factors, and trend predictions; the second section focuses on enterprise-level recommendations, generating differentiated procurement judgments based on the current selected enterprise's inventory, demand, and weight structure. This output structure preserves the integrity of the analysis process while enhancing the readability and usability of the results.

**V. Innovations**

**5.1 Dual-Engine Collaborative Decision-Making**
This project adopts a dual-engine collaborative design, integrating market judgment and enterprise decision-making within a single analytical chain. The macro analysis engine handles price prediction, information analysis, and trend judgment, answering the question of what the current market state is; the enterprise decision engine handles impact factor calculation, dynamic weight updates, and personalized recommendation generation, answering the question of how the current enterprise should act given this market state. The two capabilities are linked sequentially, enabling the system to see both the market and the enterprise.

**5.2 Dual-Layer Knowledge Graph Supporting Analysis**
The system employs a dual-layer knowledge graph design, organizing market information and enterprise information within the same relational structure. The first layer is the macro knowledge graph, primarily describing the price influence factor relationship network, macroeconomic indicator correlations, industry supply chain structure, and market dynamic events; the second layer is the enterprise knowledge graph, primarily storing personalized parameters for three typical enterprise types (A, B, C), impact factor weight matrices, historical procurement decision records, and enterprise-specific risk factors. Through the combination of ontological frameworks and instance data, coupled with automatic self-learning and updating of the knowledge graph, the system can further infer enterprise recommendations from market changes.

**5.3 Hybrid ARIMA + XGBoost Price Prediction Model and Enterprise Differentiation Weight Model**
This project establishes a corporate impact factor weight model around three dimensions: supply-side factors, demand factors, and inventory information. The system converts enterprise states into a computable, comparable structure through differentiated weight settings for enterprises of different sizes, and supports real-time weight updates based on market changes and enterprise conditions. Thus, a unified market trend judgment can generate different procurement recommendations for different enterprises. The most typical application scenario for this project is for corporate procurement personnel to make rapid judgments when market changes occur. The system first explains the market state, then generates procurement recommendations based on enterprise conditions, helping the enterprise clarify whether procurement is advisable at the current time and what pace should be adopted. Under the same market background, different types of enterprises receive different recommendations. By displaying the results of the three typical entity types in parallel, the system intuitively demonstrates how enterprise conditions influence procurement judgments, enhancing the visibility and persuasiveness of the analysis.

Furthermore, the system can be used for weekly procurement analysis and reporting. After completing the analysis, enterprises can further organize the results for use in weekly meetings, departmental reports, or procurement decision records, reducing manual compilation costs. If enterprises receive quotations, charts, or other image materials, the system can also assist in extracting key information and incorporating it into the analysis process, improving information access efficiency.

**VII. Testing Results**

Functional testing primarily focuses on the core usage pathways of the system. The system can fully realize the process of "market analysis — enterprise judgment — result output." Based on the current system design, the testing content mainly includes four aspects: dialogue functionality, price prediction, enterprise weight calculation, and reporting functionality. Dialogue functionality tests whether the system correctly understands enterprise queries and generates structured answers concerning price trends, procurement recommendations, risk judgments, etc.; price prediction tests whether the system can form reasonable judgments on short-term future price trends based on historical price data, recent market news, and supply-demand changes.
