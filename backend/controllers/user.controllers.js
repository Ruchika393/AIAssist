 import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"
 export const getCurrentUser=async (req,res)=>{
    try {
        const userId=req.userId
        const user=await User.findById(userId).select("-password")
        if(!user){
return res.status(400).json({message:"user not found"})
        }

   return res.status(200).json(user)     
    } catch (error) {
       return res.status(400).json({message:"get current user error"}) 
    }
}
export const updateAssistant=async (req,res)=>{
   try {
      const {assistantName,imageUrl}=req.body
      let assistantImage;
if(req.file){
   assistantImage=await uploadOnCloudinary(req.file.path)
}else{
   assistantImage=imageUrl
}
const user=await User.findByIdAndUpdate(req.userId,{
   assistantName,assistantImage
},{new:true}).select("-password")
return res.status(200).json(user)

      
   } catch (error) {
       return res.status(400).json({message:"updateAssistantError user error"}) 
   }
}
export const askToAssistant=async (req,res)=>{
   try {
      console.log("askToAssistant called with command:", req.body?.command)
      const {command}=req.body
      if (!command) {
        return res.status(400).json({ response: "Command is required" })
      }
      
      const user=await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ response: "User not found" })
      }
      
      user.history.push(command)
      await user.save()
      const userName=user.name
      const assistantName=user.assistantName
      
      if (!assistantName) {
        return res.status(400).json({ response: "Assistant name not set. Please customize your assistant first." })
      }
      
      console.log("Calling geminiResponse with:", { command, assistantName, userName })
      const result=await geminiResponse(command,assistantName,userName)
      console.log("geminiResponse returned:", result?.substring(0, 200)) // Log first 200 chars
      
      if (!result) {
        return res.status(500).json({ response: "Failed to get response from AI" })
      }

      const jsonMatch=result.match(/{[\s\S]*}/)
      if(!jsonMatch){
         return res.status(400).json({response:"sorry, i can't understand"})
      }
      
      let gemResult;
      try {
        gemResult=JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Raw result:", result)
        return res.status(500).json({response:"Failed to parse AI response"})
      }
      
      console.log(gemResult)
      
      if (!gemResult || !gemResult.type) {
        return res.status(400).json({response:"Invalid response format from AI"})
      }
      
      const type=gemResult.type

      switch(type){
         case 'get-date' :
            return res.json({
               type,
               userInput:gemResult.userInput,
               response:`current date is ${moment().format("YYYY-MM-DD")}`
            });
            case 'get-time':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`current time is ${moment().format("hh:mm A")}`
            });
             case 'get-day':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`today is ${moment().format("dddd")}`
            });
            case 'get-month':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`today is ${moment().format("MMMM")}`
            });
      case 'google-search':
      case 'youtube-search':
      case 'youtube-play':
      case 'general':
      case  "calculator-open":
      case "instagram-open": 
       case "facebook-open": 
       case "weather-show" :
         return res.json({
            type,
            userInput:gemResult.userInput,
            response:gemResult.response,
         });

         default:
            return res.status(400).json({ response: "I didn't understand that command." })
      }
     

   } catch (error) {
      console.error("askToAssistant error:", error)
      console.error("Error stack:", error.stack)
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        code: error.code
      })
      return res.status(500).json({ 
        response: error.message || "ask assistant error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
   }
}