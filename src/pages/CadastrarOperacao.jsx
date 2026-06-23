import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";

export default function CadastrarOperacao() {

  const [form, setForm] = useState({
    nome_operacao: "",
    numero_autos: "",
    vara: "",
  });


  const [operacoes, setOperacoes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const [nucleos, setNucleos] = useState([]);
  const [nucleosSelecionados, setNucleosSelecionados] = useState([]);

  const navigate = useNavigate();


async function carregarOperacoes() {

  const {
    data:{user}
  } = await supabase.auth.getUser();


  if(!user) return;

  setUsuarioLogado(user);

  const {data:usuario,error:erroUsuario}=

  await supabase
  .from("usuarios")
  .select("nucleo_id")
  .eq("user_id",user.id)
  .single();


  if(erroUsuario || !usuario)
    return;



  // Operações próprias + compartilhadas

  const {data,error}=

  await supabase
  .from("operacoes")
  .select(`
      *,
      operacoes_compartilhadas(
        nucleo_id
      )
  `)
  .order("nome_operacao");



  if(error){
    console.log("OPERACOES RETORNADAS:", data);
    console.log(error);
    console.log("NUCLEO DO USUARIO:", usuario.nucleo_id);
    return;

  }



  const filtradas = data.filter((op)=>{


    // operação do próprio núcleo

    if(op.nucleo_id === usuario.nucleo_id)
      return true;



    // operação compartilhada

    return op.operacoes_compartilhadas?.some(
      c=>c.nucleo_id === usuario.nucleo_id
    );


  });



  setOperacoes(filtradas || []);


}


  async function carregarNucleos() {

    const { data, error } = await supabase
      .from("nucleos")
      .select("*")
      .order("nome");


    if (!error) {
      setNucleos(data || []);
    }

  }



  useEffect(() => {

    carregarOperacoes();
    carregarNucleos();

  }, []);



  const toggleNucleo = (id) => {

    setNucleosSelecionados((prev) =>
      prev.includes(id)
        ? prev.filter((n) => n !== id)
        : [...prev, id]
    );

  };



  const handleChange = (e) => {

    const { name, value } = e.target;

    let newValue = value;


    if (name === "nome_operacao" && value.length > 20) {
      newValue = value.slice(0,20);
    }


    if (name === "vara" && value.length > 50) {
      newValue = value.slice(0,50);
    }


    if (name === "numero_autos") {

      const apenasNumeros =
        value.replace(/\D/g,"").slice(0,20);


      let masked = "";


      for(let i=0;i<apenasNumeros.length;i++){

        masked += apenasNumeros[i];


        if(
          i === 6 ||
          i === 8 ||
          i === 12 ||
          i === 13 ||
          i === 15
        ){
          masked += ".";
        }

      }


      newValue = masked;

    }



    setForm({
      ...form,
      [name]: newValue
    });

  };




  const validarNumeroAutos = (numero)=>{

    const regex =
    /^\d{7}\.\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;


    return regex.test(numero);

  };





  const handleEdit = (operacao)=>{

    if(operacao.user_id !== usuarioLogado?.id){

alert(
"Você não tem permissão para editar esta operação."
);

return;

}


    setForm({

      nome_operacao: operacao.nome_operacao,
      numero_autos: operacao.numero_autos,
      vara: operacao.vara,

    });


    setEditandoId(operacao.id);


  };






  const handleSubmit = async(e)=>{

    e.preventDefault();



    if(!validarNumeroAutos(form.numero_autos)){

      alert("Número dos Autos inválido!");
      return;

    }




    const {
      data:{user},
      error:userError

    } = await supabase.auth.getUser();



    if(userError || !user){

      alert("Usuário não autenticado.");
      return;

    }





    const {data:usuario,error:usuarioError}=

    await supabase
    .from("usuarios")
    .select("nucleo_id")
    .eq("user_id",user.id)
    .single();




    if(usuarioError || !usuario?.nucleo_id){

      alert("Usuário sem núcleo vinculado.");
      return;

    }





    // EDITAR

    if(editandoId){


      const {error}=

      await supabase
      .from("operacoes")
      .update({

        nome_operacao:form.nome_operacao,
        numero_autos:form.numero_autos,
        vara:form.vara

      })
      .eq("id",editandoId);
await supabase
.from("operacoes_compartilhadas")
.delete()
.eq("operacao_id",editandoId);



const novosCompartilhamentos =

nucleosSelecionados
.filter(id => id !== usuario.nucleo_id)
.map(id=>({

  operacao_id:editandoId,
  nucleo_id:id

}));



if(novosCompartilhamentos.length>0){

 await supabase
 .from("operacoes_compartilhadas")
 .insert(novosCompartilhamentos);

}


      if(error){

        alert(error.message);
        return;

      }



      alert("Operação atualizada!");

      setEditandoId(null);

      carregarOperacoes();

      return;


    }







    // NOVA OPERAÇÃO


    const {data:novaOperacao,error}=

await supabase
.from("operacoes")
.insert({

  nome_operacao:form.nome_operacao,
  numero_autos:form.numero_autos,
  vara:form.vara,
  user_id:user.id,
  nucleo_id:usuario.nucleo_id,
  compartilhada:nucleosSelecionados.length > 0

})
    .select()
    .single();





    if(error){

      alert(
        "Erro ao cadastrar operação: "+
        error.message
      );

      return;

    }






    // COMPARTILHAMENTO

    if(nucleosSelecionados.length > 0){


const compartilhamentos =

nucleosSelecionados
.filter(id => id !== usuario.nucleo_id)
.map((id)=>({

  operacao_id:novaOperacao.id,
  nucleo_id:id

}));


if(compartilhamentos.length > 0){

  const {error:erroCompartilhar}=

  await supabase
  .from("operacoes_compartilhadas")
  .insert(compartilhamentos);



  if(erroCompartilhar){

    alert(
      "Erro ao compartilhar: "+
      erroCompartilhar.message
    );

    return;

  }

}

}



        alert("Operação cadastrada com sucesso!");



    setForm({

      nome_operacao:"",
      numero_autos:"",
      vara:""

    });


    setNucleosSelecionados([]);


    carregarOperacoes();


  };







  const handleDelete = async(id)=>{


    if(!window.confirm(
      "Deseja excluir esta operação?"
    ))
    return;



    const {error}=

    await supabase
    .from("operacoes")
    .delete()
    .eq("id",id);



    if(error){

      alert(error.message);
      return;

    }


    carregarOperacoes();


  };







return (

<div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow mt-10">


<button

onClick={()=>navigate("/home")}

className="mb-4 bg-gray-300 px-4 py-2 rounded"

>

← Voltar

</button>



<h2 className="text-2xl font-bold mb-5">

Cadastrar Operação

</h2>




<form onSubmit={handleSubmit} className="space-y-4">



<input

name="nome_operacao"

value={form.nome_operacao}

onChange={handleChange}

placeholder="Nome da operação"

className="border p-2 w-full rounded"

/>




<input

name="numero_autos"

value={form.numero_autos}

onChange={handleChange}

placeholder="0000000.00.0000.0.00.0000"

className="border p-2 w-full rounded"

/>




<input

name="vara"

value={form.vara}

onChange={handleChange}

placeholder="Vara"

className="border p-2 w-full rounded"

/>






<div>

<label className="font-bold">

Compartilhar com Núcleos

</label>


<div className="border p-3 mt-2">


{
nucleos.map((nucleo)=>(


<label
key={nucleo.id}
className="block"
>


<input

type="checkbox"

checked={
nucleosSelecionados.includes(nucleo.id)
}

onChange={()=>toggleNucleo(nucleo.id)}

/>


{" "}
{nucleo.nome}


</label>


))

}



</div>


</div>





<button

className="bg-green-600 text-white px-4 py-2 rounded"

>

Salvar

</button>


</form>





<h3 className="font-bold text-xl mt-8">

Operações

</h3>



{

operacoes.map((op)=>(


<div

key={op.id}

className="border p-3 mt-2 flex justify-between"

>


<span>

{op.nome_operacao}

</span>



<div>


{
op.user_id === usuarioLogado?.id && (

<button

onClick={()=>handleEdit(op)}

className="bg-blue-600 text-white px-2 py-1 rounded mr-2"

>

Editar

</button>

)
}



{
op.user_id === usuarioLogado?.id && (

<button

onClick={()=>handleDelete(op.id)}

className="bg-red-600 text-white px-2 py-1 rounded"

>

Excluir

</button>

)
}


</div>


</div>


))

}



</div>

);


}